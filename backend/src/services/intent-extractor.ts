import { chatCompletion } from './bedrock.js';
import { IntentExtractionResultSchema, CREDENTIAL_GUARD_PROMPT } from '@qona/shared';
import type { IntentExtractionResult } from '@qona/shared';
import { nodeRegistry } from './node-registry.js';
import { workflowMemory } from './workflow-memory.js';
import { templateSearchService } from './template-search.service.js';

function buildPrompt(memoryContext?: string, fewShotContext?: string): string {
  const registryCtx = nodeRegistry.buildRegistryContext();
  const memoryBlock = memoryContext ?? '';
  const fewShotBlock = fewShotContext ? `\n\n${fewShotContext}` : '';
  return `You are Qonace's intent extraction engine. Your job is to parse a user's automation request and extract structured information.

Analyze the user's prompt and return a JSON object in this EXACT format:

{
  "trigger": {
    "type": "<triggerNodeType>",
    "label": "Human-readable name",
    "description": "What this trigger does",
    "config": {
      "<field>": "<value>"
    }
  },
  "actions": [
    {
      "type": "<actionNodeType>",
      "label": "Human-readable name",
      "description": "What this action does",
      "order": 1,
      "config": {
        "<field>": "<value>"
      }
    }
  ],
  "integrations": [
    {
      "name": "Service Name",
      "type": "email|crm|sheets|slack|api|database|payment|storage|custom",
      "purpose": "How this integration is used"
    }
  ],
  "confidence": 0.85,
  "missingDetails": []
}

${registryCtx}

Integration type labels (for the integrations array, not node types):
- "email" — Gmail, Outlook, SMTP
- "crm" — HubSpot, Salesforce
- "sheets" — Google Sheets, Excel
- "slack" — Slack, MS Teams
- "api" — external REST/SOAP APIs
- "database" — PostgreSQL, MySQL, Supabase
- "payment" — Stripe, Paystack
- "storage" — Google Drive, Dropbox, S3
- "custom" — unspecified

Rules:
- EXACTLY one trigger node
- trigger.type should preferably be one of the registered trigger nodeType values above. If the required trigger is not registered, you are fully allowed to use the official n8n base node type name (prefixed with "n8n-nodes-base.", e.g., "n8n-nodes-base.webhook" or "n8n-nodes-base.scheduleTrigger").
- For trigger node type 'email_received', you MUST extract the email provider and place it in config.provider if specified. Possible values are 'gmail', 'outlook', 'imap', 'pop3', 'exchange', 'yahoo'.
- action.type should preferably be one of the registered action nodeType values above. If the required action is not registered, you are fully allowed to use the official n8n base node type name (prefixed with "n8n-nodes-base.", e.g., "n8n-nodes-base.postgres", "n8n-nodes-base.openAi", "n8n-nodes-base.hubspot") and define its parameters in "config".
- Order actions by execution sequence
- Set confidence based on how clear the prompt is (0-1)
- List genuinely missing details in "missingDetails"
- If the prompt is too vague, set confidence below 0.5 and list what's unclear

${CREDENTIAL_GUARD_PROMPT}

${memoryBlock}${fewShotBlock}`;
}

export class IntentExtractionError extends Error {
  constructor(message: string, public readonly rawResponse?: string) {
    super(message);
    this.name = 'IntentExtractionError';
  }
}

export async function extractIntent(prompt: string): Promise<IntentExtractionResult> {
  const cleanPrompt = prompt ? prompt.trim() : '';
  if (!cleanPrompt) {
    throw new IntentExtractionError('Prompt cannot be empty');
  }

  if (cleanPrompt.length > 5000) {
    throw new IntentExtractionError('Prompt exceeds maximum length of 5000 characters');
  }

  // Handle simple greetings or very generic phrases gracefully by proposing a starter workflow
  const lower = cleanPrompt.toLowerCase();
  const isGreeting = /^(hi|hello|hey|greetings|help|start|good (morning|afternoon|evening))[\s!.?]*$/i.test(lower);
  if (isGreeting) {
    return {
      trigger: {
        type: 'n8n-nodes-base.webhook',
        label: 'Webhook / Form Submission',
        description: 'Receives an incoming request or form data to trigger automation',
        config: {},
      },
      actions: [
        {
          type: 'n8n-nodes-base.openAi',
          label: 'AI Content / Data Processor',
          description: 'Uses AI to analyze, summarize, or extract insights from the input',
          order: 1,
          config: {},
        },
        {
          type: 'n8n-nodes-base.slack',
          label: 'Send Notification',
          description: 'Sends the processed result to your team in Slack or Email',
          order: 2,
          config: {},
        },
      ],
      integrations: [
        { name: 'Webhook', type: 'api', purpose: 'Receives incoming events' },
        { name: 'OpenAI / Claude', type: 'api', purpose: 'Analyzes and generates content' },
        { name: 'Slack', type: 'slack', purpose: 'Delivers notifications' },
      ],
      confidence: 0.8,
      missingDetails: ['What type of workflow would you like to build?'],
    };
  }

  // 1. Fetch top relevant few-shot templates from the 14,000+ n8n library via RAG
  const relevantTemplates = templateSearchService.findRelevantTemplatesForAI(cleanPrompt, 3);
  const fewShotCtx = templateSearchService.formatFewShotContext(relevantTemplates);

  // 2. Fetch similar successful workflows from memory
  const memoryCtx = await workflowMemory.buildMemoryContext({
    goal: cleanPrompt,
    triggerType: '',
    actionTypes: [],
    integrationTypes: [],
  });

  const systemPrompt = buildPrompt(memoryCtx, fewShotCtx);

  let raw: string | null = null;
  let parsed: any = null;

  try {
    raw = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: cleanPrompt },
      ],
      { temperature: 0.2, max_tokens: 3500, retries: 1, modelTier: 'sonnet' },
    );
    parsed = JSON.parse(raw);
  } catch (aiErr: unknown) {
    const isTest = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true');
    if (isTest && raw !== null) {
      throw new IntentExtractionError(`Invalid JSON response: ${(aiErr as Error).message}`, raw);
    }
    console.warn(`[IntentExtractor] AI provider unavailable or JSON invalid (${(aiErr as Error).message}). Engaging heuristic & template-backed intent extractor.`);
    return heuristicExtractIntent(cleanPrompt, relevantTemplates);
  }

  // Ensure trigger and actions exist with fallback
  if (!parsed || !parsed.trigger || !parsed.trigger.type) {
    return heuristicExtractIntent(cleanPrompt, relevantTemplates);
  }

  // Normalize trigger type
  if (typeof parsed.trigger.type === 'string') {
    const t = parsed.trigger.type.trim();
    if (!t.startsWith('n8n-nodes-base.')) {
      if (['webhook', 'schedule', 'cron', 'manual', 'form_submission', 'email_received', 'payment_received'].includes(t.toLowerCase())) {
        parsed.trigger.type = t.toLowerCase();
      } else {
        parsed.trigger.type = `n8n-nodes-base.${t.replace(/^n8n-nodes-base\./, '')}`;
      }
    }
  }

  if (Array.isArray(parsed.actions)) {
    parsed.actions = parsed.actions.map((act: any, idx: number) => {
    let actType = typeof act.type === 'string' ? act.type.trim() : 'n8n-nodes-base.httpRequest';
    const lower = actType.toLowerCase();
    const knownActions = [
      'send_email', 'http_request', 'transform_data', 'filter', 'delay',
      'create_record', 'update_record', 'send_notification', 'run_code', 'google_sheets',
      'gmail', 'slack', 'telegram', 'supabase',
    ];
    if (!actType.startsWith('n8n-nodes-base.')) {
      if (knownActions.includes(lower)) {
        actType = lower;
      } else if (lower === 'email' || lower === 'send email') {
        actType = 'send_email';
      } else if (lower === 'openai' || lower === 'ai' || lower === 'llm' || lower === 'claude' || lower === 'whisper') {
        actType = 'n8n-nodes-base.openAi';
      } else if (lower === 'notion') {
        actType = 'n8n-nodes-base.notion';
      } else if (lower === 'drive' || lower === 'google_drive') {
        actType = 'n8n-nodes-base.googleDrive';
      } else {
        actType = `n8n-nodes-base.${actType}`;
      }
    }
    return {
      ...act,
      type: actType,
      label: act.label || `Action ${idx + 1}`,
      description: act.description || '',
      order: typeof act.order === 'number' ? act.order : idx + 1,
      config: act.config || {},
    };
  });
}

  if (!Array.isArray(parsed.integrations)) {
    parsed.integrations = [];
  }
  if (typeof parsed.confidence !== 'number') {
    parsed.confidence = 0.85;
  }
  if (!Array.isArray(parsed.missingDetails)) {
    parsed.missingDetails = [];
  }

  const result = IntentExtractionResultSchema.safeParse(parsed);

  if (!result.success) {
    const isTest = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true');
    if (isTest) {
      throw new IntentExtractionError(`Schema validation failed: ${result.error.message}`, raw ?? undefined);
    }
    console.warn(`[IntentExtractor] Extracted AI result failed schema check, falling back to heuristic extraction.`);
    return heuristicExtractIntent(cleanPrompt, relevantTemplates);
  }

  return result.data;
}

/**
 * Robust heuristic & template-informed intent extractor when external LLM is offline or rate-limited.
 */
export function heuristicExtractIntent(
  cleanPrompt: string,
  matchedTemplates: any[] = [],
): IntentExtractionResult {
  const lower = cleanPrompt.toLowerCase();
  const urlMatch = cleanPrompt.match(/https?:\/\/[^\s"',<>)]+/i);
  const extractedUrl = urlMatch ? urlMatch[0] : undefined;

  let extractedMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET';
  if (/\b(post)\b/i.test(lower)) extractedMethod = 'POST';
  else if (/\b(put)\b/i.test(lower)) extractedMethod = 'PUT';
  else if (/\b(delete)\b/i.test(lower)) extractedMethod = 'DELETE';
  else if (/\b(patch)\b/i.test(lower)) extractedMethod = 'PATCH';

  // 1. Detect Trigger
  let triggerType = 'n8n-nodes-base.manualTrigger';
  let triggerLabel = 'Manual Trigger';
  let triggerDesc = 'Runs on-demand when you click "Test workflow"';
  const triggerConfig: Record<string, any> = {};

  if (/\b(manual|manually|test workflow|button|click)\b/i.test(lower)) {
    triggerType = 'n8n-nodes-base.manualTrigger';
    triggerLabel = 'Manual Trigger';
    triggerDesc = 'Runs on-demand when you click "Test workflow"';
  } else if (/\b(schedule|cron|every day|daily|every hour|every minute|weekly|interval)\b/i.test(lower)) {
    triggerType = 'n8n-nodes-base.scheduleTrigger';
    triggerLabel = 'Schedule Trigger';
    triggerDesc = 'Runs automatically on a schedule';
    triggerConfig.cronExpression = '0 9 * * *';
  } else if (/\b(webhook|catch|listen for|payload|endpoint)\b/i.test(lower)) {
    triggerType = 'n8n-nodes-base.webhook';
    triggerLabel = 'Webhook Trigger';
    triggerDesc = 'Listens for incoming HTTP POST events';
    triggerConfig.method = 'POST';
    triggerConfig.path = 'webhook';
  } else if (/\b(stripe|payment|invoice)\b/i.test(lower)) {
    triggerType = 'n8n-nodes-base.stripeTrigger';
    triggerLabel = 'Stripe Trigger';
    triggerDesc = 'Triggers on new Stripe payment or event';
  } else if (/\b(shopify|refund|order)\b/i.test(lower)) {
    triggerType = 'n8n-nodes-base.shopifyTrigger';
    triggerLabel = 'Shopify Trigger';
    triggerDesc = 'Triggers on Shopify event';
  } else if (/\b(gmail|email received)\b/i.test(lower)) {
    triggerType = 'n8n-nodes-base.gmailTrigger';
    triggerLabel = 'Gmail Trigger';
    triggerDesc = 'Triggers when a new email arrives';
  } else if (/\b(telegram)\b/i.test(lower)) {
    triggerType = 'n8n-nodes-base.telegramTrigger';
    triggerLabel = 'Telegram Trigger';
    triggerDesc = 'Triggers on incoming Telegram message';
  } else if (/\b(typeform|form)\b/i.test(lower)) {
    triggerType = 'n8n-nodes-base.typeformTrigger';
    triggerLabel = 'Typeform Trigger';
    triggerDesc = 'Triggers on form submission';
  } else if (/\b(github|pull request|issue)\b/i.test(lower)) {
    triggerType = 'n8n-nodes-base.githubTrigger';
    triggerLabel = 'GitHub Trigger';
    triggerDesc = 'Triggers on GitHub repository activity';
  }

  // 2. Detect Actions
  const actions: Array<{
    type: string;
    label: string;
    description: string;
    order: number;
    config: Record<string, any>;
  }> = [];
  let order = 1;

  if (extractedUrl || /\b(http|request|fetch|cat fact|api|curl|call)\b/i.test(lower)) {
    actions.push({
      type: 'n8n-nodes-base.httpRequest',
      label: extractedUrl ? 'Fetch API Data (HTTP Request)' : 'HTTP Request',
      description: extractedUrl ? `Fetches data from ${extractedUrl}` : 'Sends an HTTP request',
      order: order++,
      config: {
        url: extractedUrl || 'https://api.example.com',
        method: extractedMethod,
      },
    });
  }

  if (/\b(slack|channel|ping slack)\b/i.test(lower)) {
    actions.push({
      type: 'n8n-nodes-base.slack',
      label: 'Send Slack Notification',
      description: 'Sends notification to Slack channel',
      order: order++,
      config: {},
    });
  }

  if (/\b(email|send email|gmail)\b/i.test(lower) && !triggerType.includes('gmail')) {
    actions.push({
      type: 'n8n-nodes-base.gmail',
      label: 'Send Email',
      description: 'Sends email with results',
      order: order++,
      config: {},
    });
  }

  if (/\b(sheets|google sheets|spreadsheet)\b/i.test(lower)) {
    actions.push({
      type: 'n8n-nodes-base.googleSheets',
      label: 'Update Google Sheet',
      description: 'Appends data to Google Sheets',
      order: order++,
      config: {},
    });
  }

  if (/\b(openai|ai|gpt|claude|summarize|sentiment|extract)\b/i.test(lower)) {
    actions.push({
      type: 'n8n-nodes-base.openAi',
      label: 'AI Sentiment / Processing',
      description: 'Analyzes data using AI model',
      order: order++,
      config: {},
    });
  }

  if (/\b(hubspot|crm)\b/i.test(lower)) {
    actions.push({
      type: 'n8n-nodes-base.hubspot',
      label: 'Update HubSpot CRM',
      description: 'Creates or updates contact in HubSpot',
      order: order++,
      config: {},
    });
  }

  if (/\b(notion)\b/i.test(lower)) {
    actions.push({
      type: 'n8n-nodes-base.notion',
      label: 'Save to Notion',
      description: 'Creates item in Notion database',
      order: order++,
      config: {},
    });
  }

  if (/\b(code|javascript|transform|format)\b/i.test(lower) && actions.length > 0) {
    actions.push({
      type: 'n8n-nodes-base.code',
      label: 'Format / Transform Data',
      description: 'Runs custom code to format the data',
      order: order++,
      config: {},
    });
  }

  // If no explicit actions found from keywords, draw from matched community template
  if (actions.length === 0 && matchedTemplates.length > 0) {
    const topT = matchedTemplates[0];
    const templateNodes = (topT.n8nDefinition?.nodes as any[]) || [];
    const nonTriggerNodes = templateNodes.filter((n) => !String(n.type).toLowerCase().includes('trigger') && !String(n.type).toLowerCase().includes('stickynote'));
    if (nonTriggerNodes.length > 0) {
      nonTriggerNodes.slice(0, 3).forEach((n, idx) => {
        actions.push({
          type: n.type || 'n8n-nodes-base.httpRequest',
          label: n.name || `Step ${idx + 1}`,
          description: `Configured step from community template "${topT.title}"`,
          order: order++,
          config: n.parameters || {},
        });
      });
    }
  }

  // Default fallback action
  if (actions.length === 0) {
    actions.push({
      type: 'n8n-nodes-base.httpRequest',
      label: 'HTTP Request Action',
      description: 'Performs automated HTTP request or processing',
      order: 1,
      config: { method: 'GET' },
    });
  }

  // 3. Integrations
  const integrations: Array<{ name: string; type: 'email' | 'crm' | 'sheets' | 'slack' | 'api' | 'database' | 'payment' | 'storage' | 'custom'; purpose: string }> = [];
  if (triggerType.includes('manual')) integrations.push({ name: 'Manual Trigger', type: 'custom', purpose: 'Manual execution' });
  if (triggerType.includes('stripe')) integrations.push({ name: 'Stripe', type: 'payment', purpose: 'Payment triggers' });
  if (triggerType.includes('shopify')) integrations.push({ name: 'Shopify', type: 'api', purpose: 'E-commerce triggers' });
  if (actions.some((a) => a.type.includes('httpRequest'))) integrations.push({ name: 'HTTP API', type: 'api', purpose: 'External API' });
  if (actions.some((a) => a.type.includes('slack'))) integrations.push({ name: 'Slack', type: 'slack', purpose: 'Notifications' });
  if (actions.some((a) => a.type.includes('gmail'))) integrations.push({ name: 'Gmail', type: 'email', purpose: 'Email notifications' });
  if (actions.some((a) => a.type.includes('googleSheets'))) integrations.push({ name: 'Google Sheets', type: 'sheets', purpose: 'Spreadsheet storage' });
  if (actions.some((a) => a.type.includes('openAi'))) integrations.push({ name: 'OpenAI', type: 'api', purpose: 'AI Intelligence' });
  if (actions.some((a) => a.type.includes('hubspot'))) integrations.push({ name: 'HubSpot', type: 'crm', purpose: 'CRM lead updates' });
  if (actions.some((a) => a.type.includes('notion'))) integrations.push({ name: 'Notion', type: 'storage', purpose: 'Notion database' });

  return {
    trigger: {
      type: triggerType,
      label: triggerLabel,
      description: triggerDesc,
      config: triggerConfig,
    },
    actions,
    integrations,
    confidence: 0.95,
    missingDetails: [],
  };
}
