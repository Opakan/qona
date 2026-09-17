import { chatCompletion } from './bedrock.js';
import { IntentExtractionResultSchema, CREDENTIAL_GUARD_PROMPT } from '@qona/shared';
import type { IntentExtractionResult } from '@qona/shared';
import { nodeRegistry } from './node-registry.js';
import { workflowMemory } from './workflow-memory.js';

function buildPrompt(memoryContext?: string): string {
  const registryCtx = nodeRegistry.buildRegistryContext();
  const memoryBlock = memoryContext ?? '';
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

${memoryBlock}`;}

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

  // Fetch similar successful workflows from memory
  const memoryCtx = await workflowMemory.buildMemoryContext({
    goal: cleanPrompt,
    triggerType: '',
    actionTypes: [],
    integrationTypes: [],
  });

  const systemPrompt = buildPrompt(memoryCtx);

  const raw = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: cleanPrompt },
    ],
    { temperature: 0.2, max_tokens: 3500, retries: 2, modelTier: 'sonnet' },
  );

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new IntentExtractionError('AWS Bedrock returned invalid JSON', raw);
  }

  // Ensure trigger and actions exist with fallback
  if (!parsed.trigger || !parsed.trigger.type) {
    parsed.trigger = {
      type: 'n8n-nodes-base.webhook',
      label: 'Webhook Trigger',
      description: 'Triggers the workflow',
      config: {},
    };
  }
  if (!Array.isArray(parsed.actions) || parsed.actions.length === 0) {
    parsed.actions = [
      {
        type: 'n8n-nodes-base.httpRequest',
        label: 'Process Request',
        description: 'Performs automated action',
        order: 1,
        config: {},
      },
    ];
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
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new IntentExtractionError(
      `Extraction validation failed: ${issues.join('; ')}`,
      raw,
    );
  }

  return result.data;
}
