import type {
  WorkflowPlan,
  WorkflowPlanQuestion,
  WorkflowPlanRequirement,
  IntentExtractionResult,
} from '@qona/shared';
import { CREDENTIAL_FIELDS, CREDENTIAL_GUARD_PROMPT } from '@qona/shared';
import { chatCompletion } from './deepseek.js';
import { nodeRegistry } from './node-registry.js';

function isCredentialField(field: string): boolean {
  const lower = field.toLowerCase().replace(/[^a-z0-9]/g, '');
  return CREDENTIAL_FIELDS.has(lower) ||
    CREDENTIAL_FIELDS.has(field) ||
    lower.includes('apikey') || lower.includes('secret') ||
    lower.includes('password') || lower.includes('token') ||
    lower.includes('privatekey');
}

// ═══════════════════════════════════════════════════════════
// Phase 1: Convert extracted intent into requirements
// ═══════════════════════════════════════════════════════════

function buildTriggerRequirements(trigger: NonNullable<WorkflowPlan['trigger']>): WorkflowPlanRequirement[] {
  const reqs: WorkflowPlanRequirement[] = [];

  reqs.push({
    field: 'trigger_type',
    label: `Trigger type: ${trigger.type}`,
    kind: 'trigger_config',
    required: true,
    collected: true,
    value: trigger.type,
  });

  const allFields = nodeRegistry.getAllFields(trigger.type);
  for (const fieldDef of allFields) {
    if (isCredentialField(fieldDef.field)) continue;
    const existingValue = trigger.config[fieldDef.field] as string | undefined;
    reqs.push({
      field: fieldDef.field,
      label: `Trigger ${fieldDef.label}`,
      kind: 'trigger_config',
      required: fieldDef.required,
      collected: existingValue !== undefined || fieldDef.defaultValue !== undefined,
      value: existingValue ?? fieldDef.defaultValue,
    });
  }

  return reqs;
}

function buildActionRequirements(actions: WorkflowPlan['actions'], index: number): WorkflowPlanRequirement[] {
  const action = actions[index];
  if (!action) return [];

  const reqs: WorkflowPlanRequirement[] = [];

  reqs.push({
    field: `action_${index}_type`,
    label: `Action ${index + 1} type: ${action.type}`,
    kind: 'action_config',
    required: true,
    collected: true,
    value: action.type,
  });

  const allFields = nodeRegistry.getAllFields(action.type);
  for (const fieldDef of allFields) {
    if (isCredentialField(fieldDef.field)) continue;
    const existingValue = action.config[fieldDef.field] as string | undefined;
    reqs.push({
      field: `action_${index}_${fieldDef.field}`,
      label: `Action ${index + 1} ${fieldDef.label}`,
      kind: 'action_config',
      required: fieldDef.required,
      collected: existingValue !== undefined || fieldDef.defaultValue !== undefined,
      value: existingValue ?? fieldDef.defaultValue,
    });
  }

  // If action type not in registry, warn but still collect
  if (!nodeRegistry.isRegistered(action.type)) {
    reqs.push({
      field: `action_${index}_unregistered`,
      label: `Action ${index + 1} (unregistered type: ${action.type})`,
      kind: 'action_config',
      required: true,
      collected: false,
    });
  }

  return reqs;
}

function buildIntegrationRequirements(integrations: WorkflowPlan['integrations']): WorkflowPlanRequirement[] {
  return integrations.map((integration) => ({
    field: `integration_${integration.type}`,
    label: `Integration: ${integration.name}`,
    kind: 'integration' as const,
    required: false,
    collected: true,
    value: integration.name,
  }));
}

function buildGeneralRequirements(goal: string): WorkflowPlanRequirement[] {
  const reqs: WorkflowPlanRequirement[] = [
    {
      field: 'workflow_name',
      label: 'Workflow name',
      kind: 'general',
      required: false,
      collected: false,
    },
    {
      field: 'workflow_description',
      label: 'Workflow description',
      kind: 'general',
      required: false,
      collected: false,
    },
  ];

  const autoName = goal.slice(0, 60).replace(/[^a-zA-Z0-9 ]/g, '');
  if (autoName.length > 0) {
    reqs[0].collected = true;
    reqs[0].value = autoName;
  }

  return reqs;
}

// ═══════════════════════════════════════════════════════════
// Phase 2: Detect missing requirements
// ═══════════════════════════════════════════════════════════

export function detectMissingRequirements(requirements: WorkflowPlanRequirement[]): WorkflowPlanRequirement[] {
  return requirements.filter((r) => r.required && !r.collected);
}

// ═══════════════════════════════════════════════════════════
// Phase 3: Generate the next question
// ═══════════════════════════════════════════════════════════

const QUESTION_HUMAN_MAP: Record<string, string> = {
  method: 'Which HTTP method should be used?',
  path: 'What URL path should the webhook listen on?',
  cronExpression: 'When should this workflow run? (e.g. "every day at 9am" or a cron expression)',
  schedule_time: 'When should this workflow run?',
  to: 'Who should receive the email?',
  subject: 'What should the email subject line be?',
  url: 'What is the API endpoint URL?',
  expression: 'What condition should filter the data?',
  durationMs: 'How long should the workflow delay before continuing?',
  code: 'What code should be executed?',
  spreadsheetId: 'What is the Google Sheets spreadsheet ID?',
  sheetName: 'Which sheet name should be used?',
  formProvider: 'Which form provider are you using?',
  emailAccount: 'Which email account should be monitored?',
  table: 'Which table or resource should be used?',
  service: 'Which notification service should be used?',
  template: 'What email template should be used?',
  body: 'What should the request body contain?',
  fromEmail: 'Which email address should the email come from?',
};

function humanizeField(field: string): string {
  return QUESTION_HUMAN_MAP[field] ?? `What should the "${field}" be?`;
}

export function generateNextQuestion(
  plan: WorkflowPlan,
  req: WorkflowPlanRequirement,
): WorkflowPlanQuestion {
  const question: WorkflowPlanQuestion = {
    id: `q_${req.field}_${Date.now()}`,
    question: humanizeField(req.field),
    field: req.field,
    severity: req.required ? 'required' : 'recommended',
    answered: false,
    affects: req.kind === 'trigger_config'
      ? 'trigger'
      : req.kind === 'action_config'
        ? 'action'
        : 'integration',
  };

  if (req.field === 'method') {
    question.options = ['GET', 'POST', 'PUT', 'DELETE'];
    question.defaultValue = 'POST';
  }

  return question;
}

// ═══════════════════════════════════════════════════════════
// Phase 4: Collect answer for a requirement
// ═══════════════════════════════════════════════════════════

export function collectAnswer(
  plan: WorkflowPlan,
  field: string,
  value: string,
): WorkflowPlan {
  const mutated = structuredClone(plan);

  const requirement = mutated.requirements.find((r) => r.field === field);
  if (requirement) {
    requirement.collected = true;
    requirement.value = value;
  }

  const question = mutated.questions.find((q) => q.field === field);
  if (question) {
    question.answered = true;
    question.answer = value;
  }

  return mutated;
}

// ═══════════════════════════════════════════════════════════
// Phase 0: Build initial plan FROM extracted intent
// ═══════════════════════════════════════════════════════════

export function buildInitialPlan(
  intent: IntentExtractionResult,
  userPrompt: string,
): WorkflowPlan {
  const trigger = {
    type: intent.trigger.type,
    label: intent.trigger.label,
    description: intent.trigger.description || '',
    config: (intent.trigger.config ?? {}) as Record<string, unknown>,
  };

  const actions = intent.actions.map((a) => ({
    type: a.type,
    label: a.label,
    description: a.description || '',
    order: a.order,
    config: (a.config ?? {}) as Record<string, unknown>,
  }));

  const integrations = (intent.integrations ?? []).map((i) => ({
    name: i.name,
    type: i.type,
    purpose: i.purpose || '',
  }));

  const requirements: WorkflowPlanRequirement[] = [
    ...buildTriggerRequirements(trigger),
    ...actions.flatMap((_, i) => buildActionRequirements(actions, i)),
    ...buildIntegrationRequirements(integrations),
    ...buildGeneralRequirements(userPrompt),
  ];

  const questions: WorkflowPlanQuestion[] = [];
  const missing = detectMissingRequirements(requirements);
  for (const req of missing) {
    questions.push({
      id: `q_${req.field}_${Date.now()}`,
      question: humanizeField(req.field),
      field: req.field,
      severity: req.required ? 'required' : 'recommended',
      answered: false,
      affects: req.kind === 'trigger_config'
        ? 'trigger'
        : req.kind === 'action_config'
          ? 'action'
          : 'integration',
    });
  }

  return {
    goal: userPrompt,
    stage: 'planning',
    trigger,
    actions,
    integrations,
    questions,
    requirements,
    confidence: intent.confidence,
  };
}

// ═══════════════════════════════════════════════════════════
// Phase: AI-powered question generation (for natural language)
// ═══════════════════════════════════════════════════════════

export async function generateAIQuestion(
  plan: WorkflowPlan,
  field: WorkflowPlanRequirement,
): Promise<WorkflowPlanQuestion> {
  const collectedSummary = plan.requirements
    .filter((r) => r.collected)
    .map((r) => `${r.label}: ${r.value}`)
    .join('\n');

  const nodeList = nodeRegistry.buildTypeList();

  const prompt = `You are Qona, guiding a user through building a workflow step by step.

Current workflow plan:
Goal: ${plan.goal}
Trigger: ${plan.trigger?.type ?? 'unknown'} (${plan.trigger?.label ?? ''})
Actions: ${plan.actions.map((a) => a.type).join(', ') || 'none'}
Already collected: ${collectedSummary || 'nothing yet'}

The next thing to ask about is: ${field.label}

Available service types: ${nodeList}

Return a JSON object:
{
  "question": "Your natural, conversational question",
  "field": "${field.field}",
  "options": ["Option A", "Option B"],
  "required": ${field.required}
}

Rules:
- Ask exactly one question
- Be conversational and helpful  
- Include options when asking about choices (use only the available service types above)
- NEVER ask technical details like HTTP methods, URL paths, or n8n node configuration
- Ask only business-level questions like "which service", "which email", "when should it run"

${CREDENTIAL_GUARD_PROMPT}`;

  try {
    const raw = await chatCompletion([
      { role: 'system', content: prompt },
      { role: 'user', content: `Ask your next question about: ${field.label}` },
    ], { temperature: 0.7, max_tokens: 400, retries: 1 });

    const parsed = JSON.parse(raw) as {
      question?: string;
      field?: string;
      options?: string[];
      required?: boolean;
    };

    if (parsed.question) {
      return {
        id: `q_${field.field}_${Date.now()}`,
        question: parsed.question,
        field: parsed.field ?? field.field,
        severity: (parsed.required ?? field.required) ? 'required' : 'recommended',
        options: parsed.options,
        answered: false,
        affects: field.kind === 'trigger_config'
          ? 'trigger'
          : field.kind === 'action_config'
            ? 'action'
            : 'integration',
      };
    }
  } catch { /* fallback to static question */ }

  return generateNextQuestion(plan, field);
}
