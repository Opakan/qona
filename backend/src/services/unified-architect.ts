import { chatCompletion } from './bedrock.js';
import { templateSearchService } from './template-search.service.js';
import { heuristicExtractIntent } from './intent-extractor.js';
import { buildInitialPlan } from './requirement-collector.js';
import { isSinkAction } from './internal-graph-builder.js';
import type { WorkflowPlan } from '@qona/shared';

type IntegrationType = 'email' | 'database' | 'slack' | 'custom' | 'api' | 'crm' | 'sheets' | 'payment' | 'storage';

export interface UnifiedArchitectResult {
  goal: string;
  trigger: {
    type: string;
    label: string;
    description: string;
    config: Record<string, unknown>;
  };
  actions: Array<{
    type: string;
    label: string;
    description: string;
    order: number;
    config: Record<string, unknown>;
  }>;
  integrations: Array<{
    name: string;
    type: IntegrationType;
    purpose: string;
  }>;
  explanation: string;
  singleQuestion: {
    id?: string;
    question: string;
    field: string;
    options: string[];
    required: boolean;
  };
  isReadyToBuild: boolean;
}

const DEFAULT_OPTIONS = [
  'Build & Export n8n Workflow',
  'Customize Action Steps',
  'Add Email / Slack Notification',
  'Save to Google Drive & Notion',
];

export function normalizeIntegrationType(type?: string): IntegrationType {
  const allowed: IntegrationType[] = ['email', 'database', 'slack', 'custom', 'api', 'crm', 'sheets', 'payment', 'storage'];
  const lower = (type || '').toLowerCase();
  for (const a of allowed) {
    if (lower.includes(a)) return a;
  }
  return 'custom';
}

/**
 * Normalize n8n node type strings
 */
function normalizeNodeType(rawType: string, isTrigger = false): string {
  let t = rawType.trim();
  if (t.startsWith('n8n-nodes-base.')) return t;

  const lower = t.toLowerCase();
  if (isTrigger) {
    if (lower.includes('stripe')) return 'n8n-nodes-base.stripeTrigger';
    if (lower.includes('schedule') || lower.includes('cron')) return 'n8n-nodes-base.scheduleTrigger';
    if (lower.includes('manual')) return 'n8n-nodes-base.manualTrigger';
    if (lower.includes('email') || lower.includes('gmail')) return 'n8n-nodes-base.gmailTrigger';
    return 'n8n-nodes-base.webhook';
  }

  if (lower.includes('slack')) return 'n8n-nodes-base.slack';
  if (lower.includes('telegram')) return 'n8n-nodes-base.telegram';
  if (lower.includes('sheets') || lower.includes('google_sheets')) return 'n8n-nodes-base.googleSheets';
  if (lower.includes('gmail') || lower.includes('email')) return 'n8n-nodes-base.gmail';
  if (lower.includes('notion')) return 'n8n-nodes-base.notion';
  if (lower.includes('airtable')) return 'n8n-nodes-base.airtable';
  if (lower.includes('http') || lower.includes('api') || lower.includes('webhook')) return 'n8n-nodes-base.httpRequest';
  if (lower.includes('code') || lower.includes('script')) return 'n8n-nodes-base.code';
  if (lower.includes('set') || lower.includes('transform')) return 'n8n-nodes-base.set';

  return `n8n-nodes-base.${t}`;
}

/**
 * Enriches workflow actions with dynamic n8n expressions, error resilience,
 * and parallel fan-out flags.
 */
export function enrichDynamicConfig(
  triggerType: string,
  actions: Array<{
    type: string;
    label: string;
    description: string;
    order: number;
    config: Record<string, unknown>;
  }>,
  userPrompt: string,
): void {
  const lowerPrompt = userPrompt.toLowerCase();
  const lowerTrigger = triggerType.toLowerCase();

  const isStripe = lowerTrigger.includes('stripe') || /\b(stripe|payment|invoice)\b/.test(lowerPrompt);
  const isWebhook = lowerTrigger.includes('webhook') || /\b(webhook)\b/.test(lowerPrompt);
  const isSchedule = lowerTrigger.includes('schedule') || lowerTrigger.includes('cron') || /\b(schedule|daily|cron|every day)\b/.test(lowerPrompt);
  const isEmail = lowerTrigger.includes('gmail') || lowerTrigger.includes('email') || /\b(email received|incoming email)\b/.test(lowerPrompt);
  const isShopify = lowerTrigger.includes('shopify') || /\b(shopify|order|refund)\b/.test(lowerPrompt);
  const isForm = lowerTrigger.includes('form') || /\b(form|typeform|jotform|submission)\b/.test(lowerPrompt);
  const isGitHub = lowerTrigger.includes('github') || /\b(github|pull request|issue|repo)\b/.test(lowerPrompt);

  const sinkCount = actions.filter((a) => isSinkAction(a.type)).length;

  for (let idx = 0; idx < actions.length; idx++) {
    const action = actions[idx];
    const t = action.type.toLowerCase();
    const config = action.config ? { ...action.config } : {};

    // 1. Parallel Fan-Out: Connect multiple terminal sinks in parallel so failures never block
    if (sinkCount > 1 && isSinkAction(action.type)) {
      if (config.branch === undefined && config.parallel === undefined) {
        config.branch = 'parallel';
      }
    }

    // 2. Error Resilience: Add continueOnFail to notification and alert actions
    const isNotificationType =
      t.includes('slack') ||
      t.includes('telegram') ||
      t.includes('discord') ||
      t.includes('teams') ||
      t.includes('whatsapp') ||
      t.includes('twilio') ||
      t.includes('email') ||
      t.includes('gmail') ||
      t.includes('notification');

    if (isNotificationType && config.continueOnFail === undefined) {
      config.continueOnFail = true;
    }

    // 3. Dynamic n8n Expressions (starting with =)
    if (
      t.includes('slack') ||
      t.includes('telegram') ||
      t.includes('discord') ||
      t.includes('teams') ||
      t.includes('whatsapp')
    ) {
      if (!config.message && !config.text) {
        if (isStripe) {
          config.message =
            '=🎉 *New Stripe Payment Received!*\n• *Amount:* ${{ Number($json.data.object.amount) / 100 }} {{ ($json.data.object.currency || \'usd\').toUpperCase() }}\n• *Customer:* {{ $json.data.object.customer_details?.email || $json.data.object.billing_details?.email || \'Guest\' }}\n• *Payment ID:* `{{ $json.data.object.id }}`';
        } else if (isForm) {
          config.message =
            '=📋 *New Form Submission*\n• *Name:* {{ $json.name || $json.answers?.name || \'Respondent\' }}\n• *Email:* {{ $json.email || $json.answers?.email || \'N/A\' }}\n• *Time:* {{ $now.toFormat(\'yyyy-MM-dd HH:mm:ss\') }}';
        } else if (isGitHub) {
          config.message =
            '=🐙 *New GitHub Activity*\n• *Title:* {{ $json.issue?.title || $json.pull_request?.title || \'GitHub Event\' }}\n• *User:* {{ $json.sender?.login || \'User\' }}\n• *Action:* {{ $json.action || \'updated\' }}';
        } else if (isShopify) {
          config.message =
            '=🛍️ *New Shopify Order Received!*\n• *Order:* #{{ $json.order_number || $json.name || \'Order\' }}\n• *Total:* ${{ $json.total_price }} {{ $json.currency }}';
        } else if (isEmail) {
          config.message =
            '=📧 *New Email Received*\n• *From:* {{ $json.from || \'Unknown\' }}\n• *Subject:* {{ $json.subject || \'No Subject\' }}';
        } else if (isSchedule) {
          config.message =
            '=⏱️ *Scheduled Workflow Triggered*\n• *Run Time:* {{ $now.toFormat(\'yyyy-MM-dd HH:mm:ss\') }}';
        } else if (isWebhook) {
          config.message =
            '=🔔 *New Webhook Received* (at {{ $now.toFormat(\'yyyy-MM-dd HH:mm:ss\') }})\n• *Payload:* {{ JSON.stringify($json) }}';
        } else {
          config.message =
            '=🔔 *Automated Notification*\n• Event time: {{ $now.toFormat(\'yyyy-MM-dd HH:mm:ss\') }}\n• Data: {{ JSON.stringify($json) }}';
        }
      }
      if (!config.channel && !config.channelId) {
        config.channel = '#general';
      }
    } else if (t.includes('sheet') || t.includes('airtable') || t.includes('notion') || t.includes('supabase') || t.includes('database')) {
      if (!config.columns && !config.fields && !config.properties) {
        if (isStripe) {
          config.columns = {
            Date: "={{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}",
            Customer:
              "={{ $json.data.object.customer_details?.email || $json.data.object.billing_details?.name || 'Customer' }}",
            Amount: "={{ Number($json.data.object.amount) / 100 }}",
            Currency: "={{ ($json.data.object.currency || 'usd').toUpperCase() }}",
            Status: "={{ $json.data.object.status || 'succeeded' }}",
          };
        } else if (isForm) {
          config.columns = {
            Timestamp: "={{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}",
            Name: "={{ $json.name || $json.answers?.name || 'Respondent' }}",
            Email: "={{ $json.email || $json.answers?.email || 'N/A' }}",
          };
        } else if (isGitHub) {
          config.columns = {
            Date: "={{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}",
            Title: "={{ $json.issue?.title || $json.pull_request?.title || 'Event' }}",
            User: "={{ $json.sender?.login || 'User' }}",
          };
        } else if (isEmail) {
          config.columns = {
            Date: "={{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}",
            From: "={{ $json.from || 'Unknown' }}",
            Subject: "={{ $json.subject || 'No Subject' }}",
          };
        } else {
          config.columns = {
            Timestamp: "={{ $now.toFormat('yyyy-MM-dd HH:mm:ss') }}",
            Record: "={{ JSON.stringify($json) }}",
          };
        }
      }
      if (t.includes('sheet')) {
        if (!config.operation) config.operation = 'appendRow';
        if (!config.sheetName) config.sheetName = 'Sheet1';
        if (!config.dataMode) config.dataMode = 'defineBelow';
      }
    } else if (t.includes('gmail') || t.includes('emailsend') || t.includes('email')) {
      if (!config.subject) {
        if (isStripe) {
          config.subject = '=Payment Confirmation: ${{ Number($json.data.object.amount) / 100 }}';
        } else if (isForm) {
          config.subject = '=New Form Submission Received: {{ $now.toFormat(\'yyyy-MM-dd\') }}';
        } else {
          config.subject = '=Automated Notification: {{ $now.toFormat(\'yyyy-MM-dd\') }}';
        }
      }
      if (!config.body && !config.html) {
        if (isStripe) {
          config.body =
            '=Hello,\n\nA new payment of ${{ Number($json.data.object.amount) / 100 }} was received from {{ $json.data.object.customer_details?.email || \'Customer\' }}.\nPayment ID: {{ $json.data.object.id }}';
        } else if (isForm) {
          config.body =
            '=New submission received at {{ $now.toFormat(\'HH:mm:ss\') }}.\n\nDetails:\n{{ JSON.stringify($json, null, 2) }}';
        } else {
          config.body =
            '=Automated workflow completed at {{ $now.toFormat(\'HH:mm:ss\') }}.\n\nPayload:\n{{ JSON.stringify($json, null, 2) }}';
        }
      }
    }

    action.config = config;
  }
}

/**
 * Heuristic Instant Fallback (< 5ms execution, zero external network calls)
 */
export function heuristicUnifiedArchitect(userPrompt: string): UnifiedArchitectResult {
  const intent = heuristicExtractIntent(userPrompt);
  const plan = buildInitialPlan(intent, userPrompt);

  const triggerType = normalizeNodeType(plan.trigger?.type || 'webhook', true);
  const triggerLabel = plan.trigger?.label || plan.trigger?.type?.replace(/^n8n-nodes-base\./, '') || 'Trigger Node';

  const actions = plan.actions.map((a, idx) => ({
    type: normalizeNodeType(a.type, false),
    label: a.label || `Action ${idx + 1}`,
    description: a.description || 'Action step',
    order: a.order ?? idx + 1,
    config: a.config || {},
  }));

  // Enrich with dynamic n8n expressions, error resilience, and parallel branching
  enrichDynamicConfig(triggerType, actions, userPrompt);

  const isParallel = actions.filter((a) => a.config?.branch === 'parallel').length > 1;
  const asciiFlow = isParallel
    ? [
        `[⚡ ${triggerLabel}]`,
        ...actions.map(
          (a, i) =>
            `   ${i === actions.length - 1 ? '└' : '├'}─► [⚙️ ${a.label || a.type.replace(/^n8n-nodes-base\./, '')}] (Parallel)`,
        ),
      ].join('\n')
    : [
        `[⚡ ${triggerLabel}]`,
        ...actions.map((a) => `       ↓\n[⚙️ ${a.label || a.type.replace(/^n8n-nodes-base\./, '')}]`),
      ].join('\n');

  const integrationsList = plan.integrations.map((i) => i.name).join(', ') || 'Custom API';

  const explanation = `### 🚀 Automated Workflow Architecture for: "${plan.goal}"

Here is how your n8n automation is designed:

\`\`\`text
${asciiFlow}
\`\`\`

**⚡ 1. The Trigger (When something happens...)**
- **${triggerLabel}**: ${plan.trigger?.description || 'Kicks off the automation flow as soon as an incoming event is detected.'}

**⚙️ 2. The Actions (Automated steps...)**
${actions.map((a, i) => `- **Step ${i + 1} (${a.label || a.type})**: ${a.description || 'Executes the automated operation and passes payload to next step.'}${a.config?.branch === 'parallel' ? ' *(Runs in parallel from trigger)*' : ''}`).join('\n')}

---
**🔑 3rd-Party Setup & Requirements Guide**:
- **Connected Services**: ${integrationsList}
- In your n8n workspace, add your API credentials under **Credentials ➔ New** or paste your Webhook URL into the trigger source.

---
Everything is structured and ready on your canvas! Would you like to build and export this n8n workflow?`;

  return {
    goal: plan.goal,
    trigger: {
      type: triggerType,
      label: plan.trigger?.label || 'Trigger',
      description: plan.trigger?.description || 'Trigger step',
      config: plan.trigger?.config || {},
    },
    actions,
    integrations: plan.integrations.map((i) => ({
      name: i.name,
      type: normalizeIntegrationType(i.type),
      purpose: i.purpose || 'Integration',
    })),
    explanation,
    singleQuestion: {
      id: 'q_ready_generate',
      question: 'Ready to build this workflow?',
      field: 'generate_confirmation',
      options: DEFAULT_OPTIONS,
      required: false,
    },
    isReadyToBuild: true,
  };
}

/**
 * 1-Shot Unified Workflow Architect Engine
 * Combines Intent Extraction, Graph Design, Architecture Walkthrough,
 * and Next Action into a single fast LLM turn (~2.5s).
 */
export async function unifiedArchitect(
  userMessage: string,
  context?: {
    previousPlan?: WorkflowPlan | null;
    recentMessages?: Array<{ role: string; content: string }>;
  },
): Promise<UnifiedArchitectResult> {
  const cleanPrompt = userMessage.trim();

  // 1. Retrieve top matching templates for few-shot context
  const relevantTemplates = templateSearchService.findRelevantTemplatesForAI(cleanPrompt, 2);
  const templateHints = templateSearchService.formatFewShotContext(relevantTemplates);

  const systemPrompt = `You are Qonace AI, an expert automation architect for n8n.
Your goal is to design production-ready n8n automations for non-technical users in A SINGLE TURN.

You must respond with a STRICT, VALID JSON OBJECT (no markdown outside the JSON, no preamble):
{
  "goal": "Concise workflow title",
  "trigger": {
    "type": "n8n-nodes-base.<nodeType>",
    "label": "User friendly label",
    "description": "Plain English explanation of the trigger",
    "config": {}
  },
  "actions": [
    {
      "type": "n8n-nodes-base.<nodeType>",
      "label": "Action label",
      "description": "Plain English explanation of this step",
      "order": 1,
      "config": {}
    }
  ],
  "integrations": [
    { "name": "App Name", "type": "api/crm/communication/payment", "purpose": "Role in workflow" }
  ],
  "explanation": "Markdown text with: 1. ASCII flow diagram, 2. Demystified Trigger & Actions in plain English, 3. Step-by-step 3rd-party credential/API key instructions with exact click paths (e.g. 1. Go to stripe.com -> Developers -> API Keys)",
  "singleQuestion": {
    "question": "A friendly question asking if they want to build or customize",
    "options": ["Build & Export n8n Workflow", "Option 2", "Option 3"],
    "field": "next_step",
    "required": false
  },
  "isReadyToBuild": true
}

Rules:
1. Always use valid n8n node types (e.g. n8n-nodes-base.webhook, n8n-nodes-base.httpRequest, n8n-nodes-base.slack, n8n-nodes-base.googleSheets, n8n-nodes-base.gmail, n8n-nodes-base.scheduleTrigger).
2. DYNAMIC N8N EXPRESSIONS: In action "config" for ANY integration (Slack, Discord, Telegram, Email, Google Sheets, Airtable, Notion, Supabase, CRM, etc.), ALWAYS write context-aware dynamic expressions starting with '=' using $json and $now instead of static text or empty objects:
   - For notifications and emails: write dynamic messages like "=New event received: {{ $json.name || $json.data?.title }}" or "=Received at {{ $now.toFormat('HH:mm') }}"
   - For databases, spreadsheets, Airtable, and Notion: define structured field mappings with dynamic values like "columns": { "Date": "={{ $now.toISO() }}", "User": "={{ $json.email || 'Guest' }}" }
3. PARALLEL FAN-OUT BRANCHING: When a workflow has multiple independent actions (such as sending notifications AND logging to a database/spreadsheet/CRM), set "branch": "parallel" in their config. This connects them directly in parallel from the trigger so one action failing never blocks the other.
4. ERROR RESILIENCE: Set "continueOnFail": true on notification and alert actions so transient delivery errors never stop database writing.
5. The explanation MUST contain an ASCII diagram, clear numbered sections, and exact click paths for obtaining any required 3rd-party API keys or Webhook URLs.
6. The singleQuestion options MUST always include "Build & Export n8n Workflow" as an option.`;

  try {
    const raw = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        ...(templateHints ? [{ role: 'system', content: templateHints } as const] : []),
        ...(context?.previousPlan ? [{ role: 'system', content: `Current workflow plan:\nGoal: ${context.previousPlan.goal}\nTrigger: ${context.previousPlan.trigger?.type}\nActions: ${context.previousPlan.actions.map((a) => a.type).join(', ')}` } as const] : []),
        { role: 'user', content: cleanPrompt },
      ],
      { temperature: 0.2, max_tokens: 3500, retries: 1, modelTier: 'sonnet' },
    );

    let parsed: any;
    try {
      let jsonStr = raw.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn('[UnifiedArchitect] JSON parse failed, falling back to heuristic');
      return heuristicUnifiedArchitect(cleanPrompt);
    }

    if (!parsed || !parsed.goal || !parsed.trigger) {
      return heuristicUnifiedArchitect(cleanPrompt);
    }

    // Normalize types
    const triggerType = normalizeNodeType(parsed.trigger.type || 'webhook', true);
    const actions = (Array.isArray(parsed.actions) ? parsed.actions : []).map((a: any, i: number) => ({
      type: normalizeNodeType(a.type || 'httpRequest', false),
      label: a.label || `Step ${i + 1}`,
      description: a.description || 'Automated action step',
      order: a.order ?? i + 1,
      config: a.config || {},
    }));

    if (actions.length === 0) {
      actions.push({
        type: 'n8n-nodes-base.httpRequest',
        label: 'Process Request',
        description: 'Performs automated operation',
        order: 1,
        config: {},
      });
    }

    // Enrich dynamic expressions and parallel branching as safety guard
    enrichDynamicConfig(triggerType, actions, cleanPrompt);

    const options = Array.isArray(parsed.singleQuestion?.options) && parsed.singleQuestion.options.length > 0
      ? parsed.singleQuestion.options
      : DEFAULT_OPTIONS;

    if (!options.includes('Build & Export n8n Workflow')) {
      options.unshift('Build & Export n8n Workflow');
    }

    return {
      goal: parsed.goal,
      trigger: {
        type: triggerType,
        label: parsed.trigger.label || 'Trigger',
        description: parsed.trigger.description || 'Trigger step',
        config: parsed.trigger.config || {},
      },
      actions,
      integrations: (Array.isArray(parsed.integrations) ? parsed.integrations : [{ name: 'Custom API', type: 'api', purpose: 'Integration' }]).map((i: any) => ({
        name: i.name || 'Integration',
        type: normalizeIntegrationType(i.type),
        purpose: i.purpose || 'External integration',
      })),
      explanation: parsed.explanation || `### 🚀 Automated Workflow: "${parsed.goal}"\n\nWorkflow is structured on your canvas.`,
      singleQuestion: {
        id: 'q_unified_step',
        question: parsed.singleQuestion?.question || 'Ready to build this workflow?',
        field: parsed.singleQuestion?.field || 'next_step',
        options,
        required: false,
      },
      isReadyToBuild: parsed.isReadyToBuild ?? true,
    };
  } catch (err) {
    console.warn(`[UnifiedArchitect] AI call failed (${(err as Error).message}), using heuristic fallback`);
    return heuristicUnifiedArchitect(cleanPrompt);
  }
}
