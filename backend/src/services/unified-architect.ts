import { chatCompletion } from './bedrock.js';
import { templateSearchService } from './template-search.service.js';
import { heuristicExtractIntent } from './intent-extractor.js';
import { buildInitialPlan } from './requirement-collector.js';
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
 * Heuristic Instant Fallback (< 5ms execution, zero external network calls)
 */
export function heuristicUnifiedArchitect(userPrompt: string): UnifiedArchitectResult {
  const intent = heuristicExtractIntent(userPrompt);
  const plan = buildInitialPlan(intent, userPrompt);

  const triggerLabel = plan.trigger?.label || plan.trigger?.type?.replace(/^n8n-nodes-base\./, '') || 'Trigger Node';
  const actionLabels = plan.actions.map((a, i) => `Step ${i + 1}: ${a.label || a.type.replace(/^n8n-nodes-base\./, '')}`);

  const asciiFlow = [
    `[⚡ ${triggerLabel}]`,
    ...plan.actions.map((a) => `       ↓\n[⚙️ ${a.label || a.type.replace(/^n8n-nodes-base\./, '')}]`),
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
${plan.actions.map((a, i) => `- **Step ${i + 1} (${a.label || a.type})**: ${a.description || 'Executes the automated operation and passes payload to next step.'}`).join('\n')}

---
**🔑 3rd-Party Setup & Requirements Guide**:
- **Connected Services**: ${integrationsList}
- In your n8n workspace, add your API credentials under **Credentials ➔ New** or paste your Webhook URL into the trigger source.

---
Everything is structured and ready on your canvas! Would you like to build and export this n8n workflow?`;

  return {
    goal: plan.goal,
    trigger: {
      type: normalizeNodeType(plan.trigger?.type || 'webhook', true),
      label: plan.trigger?.label || 'Trigger',
      description: plan.trigger?.description || 'Trigger step',
      config: plan.trigger?.config || {},
    },
    actions: plan.actions.map((a, idx) => ({
      type: normalizeNodeType(a.type, false),
      label: a.label || `Action ${idx + 1}`,
      description: a.description || 'Action step',
      order: a.order ?? idx + 1,
      config: a.config || {},
    })),
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
2. The explanation MUST contain an ASCII diagram (e.g. [Trigger] ↓ [Action 1] ↓ [Action 2]), clear numbered sections, and exact click paths for obtaining any required 3rd-party API keys or Webhook URLs.
3. The singleQuestion options MUST always include "Build & Export n8n Workflow" as an option.`;

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
