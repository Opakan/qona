import type {
  WorkflowPlan,
  WorkflowPlanQuestion,
  WorkflowPlanRequirement,
  IntentExtractionResult,
} from '@qona/shared';
import { CREDENTIAL_FIELDS, CREDENTIAL_GUARD_PROMPT } from '@qona/shared';
import { chatCompletion } from './deepseek.js';
import { nodeRegistry } from './node-registry.js';
import { lookupRegistry } from './n8n-node-registry.js';

function isCredentialField(field: string): boolean {
  const lower = field.toLowerCase().replace(/[^a-z0-9]/g, '');
  return CREDENTIAL_FIELDS.has(lower) ||
    CREDENTIAL_FIELDS.has(field) ||
    lower.includes('apikey') || lower.includes('secret') ||
    lower.includes('password') || lower.includes('token') ||
    lower.includes('privatekey');
}

interface ResolvedReqs {
  credentials?: { required: boolean; value?: string };
  provider?: { required: boolean; value?: string };
  resource?: { required: boolean; value?: string };
  operation?: { required: boolean; value?: string };
  binaryRequirements?: { required: boolean; value?: string };
  triggerType?: { required: boolean; value?: string };
  dependencies?: { required: boolean; value?: string };
}

export function determineRequirements(nodeType: string, config: Record<string, unknown>): ResolvedReqs {
  if (nodeType === 'email_received' || nodeType === 'n8n-nodes-base.emailReadImap') {
    const p = config.provider || config.email_provider;
    const allowedProviders = ['gmail', 'outlook', 'imap', 'pop3', 'exchange', 'yahoo'];
    const resolvedProvider = typeof p === 'string' ? p.toLowerCase() : undefined;
    const isCollected = resolvedProvider && allowedProviders.includes(resolvedProvider);
    return {
      credentials: { required: false },
      provider: { required: true, value: isCollected ? resolvedProvider : undefined },
      resource: { required: true, value: 'message' },
      operation: { required: true, value: 'receive' },
      triggerType: { required: true, value: nodeType },
      dependencies: { required: true, value: 'none' },
    };
  }

  const registryEntry = lookupRegistry(nodeType);
  const providerMap: Record<string, string> = {
    'n8n-nodes-base.webhook': 'webhook',
    'n8n-nodes-base.gmail': 'google',
    'n8n-nodes-base.googleSheets': 'google',
    'n8n-nodes-base.googleDrive': 'google',
    'n8n-nodes-base.slack': 'slack',
    'n8n-nodes-base.telegram': 'telegram',
    'n8n-nodes-base.supabase': 'supabase',
    'n8n-nodes-base.emailSend': 'smtp',
    'n8n-nodes-base.cron': 'schedule',
    'n8n-nodes-base.scheduleTrigger': 'schedule',
    'n8n-nodes-base.manualTrigger': 'manual',
    'n8n-nodes-base.wait': 'wait',
    'n8n-nodes-base.if': 'if',
    'n8n-nodes-base.code': 'code',
    'n8n-nodes-base.noOp': 'system',
  };

  const credMap: Record<string, string> = {
    'n8n-nodes-base.googleSheets': 'googleSheetsOAuth2Api',
    'n8n-nodes-base.gmail': 'gmailOAuth2Api',
    'n8n-nodes-base.googleDrive': 'googleDriveOAuth2Api',
    'n8n-nodes-base.slack': 'slackOAuth2Api',
    'n8n-nodes-base.telegram': 'telegramApi',
    'n8n-nodes-base.supabase': 'supabaseApi',
    'n8n-nodes-base.emailSend': 'smtp',
  };

  const resourceMap: Record<string, string> = {
    'n8n-nodes-base.googleSheets': 'spreadsheet',
    'n8n-nodes-base.gmail': 'message',
    'n8n-nodes-base.googleDrive': 'file',
    'n8n-nodes-base.slack': 'message',
    'n8n-nodes-base.telegram': 'message',
    'n8n-nodes-base.supabase': 'row',
    'n8n-nodes-base.webhook': 'webhook',
    'n8n-nodes-base.cron': 'timer',
    'n8n-nodes-base.scheduleTrigger': 'timer',
    'n8n-nodes-base.manualTrigger': 'user',
    'n8n-nodes-base.wait': 'timer',
    'n8n-nodes-base.if': 'conditions',
  };

  const binaryMap: Record<string, string> = {
    'n8n-nodes-base.googleDrive': 'binaryData',
  };

  const n8nType = registryEntry?.n8nType ?? nodeType;

  const isTrigger = nodeType.toLowerCase().includes('trigger') || nodeType.toLowerCase().includes('webhook') || nodeType.toLowerCase().includes('cron') || nodeType.toLowerCase().includes('schedule') || nodeType === 'manual';
  
  let provider = providerMap[n8nType];
  if (!provider) {
    if (n8nType.includes('googleSheets')) provider = 'google';
    else if (n8nType.includes('gmail')) provider = 'google';
    else if (n8nType.includes('slack')) provider = 'slack';
    else if (n8nType.includes('telegram')) provider = 'telegram';
    else if (n8nType.includes('supabase')) provider = 'supabase';
    else provider = 'custom';
  }

  const credentials = credMap[n8nType] ?? 'none';
  const resource = resourceMap[n8nType] ?? 'custom';

  let operation = config.operation as string | undefined;
  if (!operation && registryEntry?.defaults?.operation) {
    operation = registryEntry.defaults.operation as string;
  }
  if (!operation && registryEntry?.defaults?.resource) {
    operation = registryEntry.defaults.resource as string;
  }
  if (!operation) {
    if (n8nType === 'n8n-nodes-base.webhook') operation = 'listen';
    else if (n8nType.includes('emailSend') || n8nType.includes('gmail')) operation = 'send';
    else if (n8nType.includes('slack')) operation = 'postMessage';
    else if (n8nType.includes('telegram')) operation = 'sendMessage';
    else if (n8nType.includes('cron') || n8nType.includes('schedule')) operation = 'tick';
    else if (n8nType === 'n8n-nodes-base.noOp') operation = 'none';
  }

  const binaryRequirements = binaryMap[n8nType] ?? 'none';

  let dependencies = config.dependencies as string | undefined;
  if (!dependencies) {
    dependencies = 'previous_step';
  }

  const noResourceNodes = [
    'n8n-nodes-base.httpRequest',
    'n8n-nodes-base.code',
    'n8n-nodes-base.noOp',
    'n8n-nodes-base.wait',
    'n8n-nodes-base.if',
  ];

  if (noResourceNodes.includes(n8nType)) {
    return {
      credentials: { required: credentials !== 'none', value: credentials !== 'none' ? credentials : undefined },
      provider: { required: true, value: provider },
      resource: { required: false, value: 'none' },
      operation: { required: false, value: 'none' },
      binaryRequirements: { required: binaryRequirements !== 'none', value: binaryRequirements !== 'none' ? binaryRequirements : undefined },
      triggerType: isTrigger ? { required: true, value: n8nType } : undefined,
      dependencies: { required: true, value: dependencies },
    };
  }

  return {
    credentials: { required: credentials !== 'none', value: credentials !== 'none' ? credentials : undefined },
    provider: { required: true, value: provider },
    resource: { required: true, value: resource },
    operation: { required: operation === undefined, value: operation },
    binaryRequirements: { required: binaryRequirements !== 'none', value: binaryRequirements !== 'none' ? binaryRequirements : undefined },
    triggerType: isTrigger ? { required: true, value: n8nType } : undefined,
    dependencies: { required: true, value: dependencies },
  };
}

// ═══════════════════════════════════════════════════════════
// Phase 1: Convert extracted intent into requirements
// ═══════════════════════════════════════════════════════════

function getNodeSchemaFields(nodeType: string): { field: string; label: string; required: boolean; defaultValue?: string }[] {
  const staticTriggerReq: Record<string, string[]> = {
    webhook: ['method', 'path'],
    schedule: ['schedule_time'],
    cron: ['cronExpression'],
    manual: [],
    form_submission: ['form_provider'],
    email_received: ['email_account'],
    payment_received: [],
  };

  const staticActionReq: Record<string, string[]> = {
    send_email: ['to', 'subject'],
    http_request: ['url', 'method'],
    transform_data: [],
    filter: ['filter_condition'],
    delay: ['delay_time'],
    create_record: ['crm_provider'],
    update_record: ['crm_provider'],
    send_notification: ['notification_service'],
    run_code: [],
    google_sheets: ['spreadsheetId', 'sheetName'],
  };

  const staticRequired = staticTriggerReq[nodeType] ?? staticActionReq[nodeType] ?? [];

  const fields: { field: string; label: string; required: boolean; defaultValue?: string }[] = [];

  const nodeDef = nodeRegistry.getNode(nodeType);
  if (nodeDef) {
    const all = [...nodeDef.requiredFields, ...nodeDef.optionalFields];
    for (const f of all) {
      const isReq = f.required || staticRequired.includes(f.field);
      fields.push({
        field: f.field,
        label: f.label,
        required: isReq,
        defaultValue: f.defaultValue,
      });
    }
  } else {
    for (const field of staticRequired) {
      let label = field;
      if (field === 'cronExpression') label = 'Cron Expression';
      else if (field === 'schedule_time') label = 'Schedule Time';
      else if (field === 'to') label = 'To Email';
      else if (field === 'subject') label = 'Subject';
      else if (field === 'url') label = 'URL';
      else if (field === 'method') label = 'HTTP Method';

      fields.push({
        field,
        label,
        required: true,
      });
    }
  }

  for (const staticField of staticRequired) {
    if (!fields.some((f) => f.field === staticField)) {
      let label = staticField;
      if (staticField === 'cronExpression') label = 'Cron Expression';
      else if (staticField === 'schedule_time') label = 'Schedule Time';
      else if (staticField === 'to') label = 'To Email';
      else if (staticField === 'subject') label = 'Subject';
      else if (staticField === 'url') label = 'URL';
      else if (staticField === 'method') label = 'HTTP Method';

      fields.push({
        field: staticField,
        label,
        required: true,
      });
    }
  }

  return fields;
}

function buildTriggerRequirements(trigger: NonNullable<WorkflowPlan['trigger']>): WorkflowPlanRequirement[] {
  const reqs: WorkflowPlanRequirement[] = [];
  const det = determineRequirements(trigger.type, trigger.config);

  if (det.triggerType) {
    reqs.push({
      field: 'trigger_type',
      label: 'Trigger trigger type',
      kind: 'trigger_config',
      required: true,
      collected: det.triggerType.value !== undefined,
      value: det.triggerType.value,
    });
  }

  reqs.push({
    field: 'trigger_provider',
    label: 'Trigger provider',
    kind: 'trigger_config',
    required: true,
    collected: det.provider?.value !== undefined,
    value: det.provider?.value,
  });

  reqs.push({
    field: 'trigger_credentials',
    label: 'Trigger credentials',
    kind: 'trigger_config',
    required: det.credentials?.required ?? false,
    collected: det.credentials?.value !== undefined,
    value: det.credentials?.value,
  });

  reqs.push({
    field: 'trigger_resource',
    label: 'Trigger resource',
    kind: 'trigger_config',
    required: true,
    collected: det.resource?.value !== undefined,
    value: det.resource?.value,
  });

  reqs.push({
    field: 'trigger_operation',
    label: 'Trigger operation',
    kind: 'trigger_config',
    required: true,
    collected: det.operation?.value !== undefined,
    value: det.operation?.value,
  });

  reqs.push({
    field: 'trigger_binary_requirements',
    label: 'Trigger binary requirements',
    kind: 'trigger_config',
    required: det.binaryRequirements?.required ?? false,
    collected: det.binaryRequirements?.value !== undefined,
    value: det.binaryRequirements?.value,
  });

  reqs.push({
    field: 'trigger_dependencies',
    label: 'Trigger dependencies',
    kind: 'trigger_config',
    required: true,
    collected: det.dependencies?.value !== undefined,
    value: det.dependencies?.value,
  });

  const fields = getNodeSchemaFields(trigger.type);
  for (const f of fields) {
    const existing = trigger.config[f.field];
    reqs.push({
      field: f.field,
      label: `Trigger ${f.label}`,
      kind: 'trigger_config',
      required: f.required,
      collected: existing !== undefined && existing !== null && String(existing).trim().length > 0,
      value: existing !== undefined ? String(existing) : undefined,
    });
  }

  return reqs;
}

function buildActionRequirements(actions: WorkflowPlan['actions'], index: number): WorkflowPlanRequirement[] {
  const action = actions[index];
  if (!action) return [];

  const reqs: WorkflowPlanRequirement[] = [];
  const det = determineRequirements(action.type, action.config);

  reqs.push({
    field: `action_${index}_type`,
    label: `Action ${index + 1} type`,
    kind: 'action_config',
    required: true,
    collected: true,
    value: action.type,
  });

  reqs.push({
    field: `action_${index}_provider`,
    label: `Action ${index + 1} provider`,
    kind: 'action_config',
    required: true,
    collected: det.provider?.value !== undefined,
    value: det.provider?.value,
  });

  reqs.push({
    field: `action_${index}_credentials`,
    label: `Action ${index + 1} credentials`,
    kind: 'action_config',
    required: det.credentials?.required ?? false,
    collected: det.credentials?.value !== undefined,
    value: det.credentials?.value,
  });

  reqs.push({
    field: `action_${index}_resource`,
    label: `Action ${index + 1} resource`,
    kind: 'action_config',
    required: true,
    collected: det.resource?.value !== undefined,
    value: det.resource?.value,
  });

  reqs.push({
    field: `action_${index}_operation`,
    label: `Action ${index + 1} operation`,
    kind: 'action_config',
    required: true,
    collected: det.operation?.value !== undefined,
    value: det.operation?.value,
  });

  reqs.push({
    field: `action_${index}_binary_requirements`,
    label: `Action ${index + 1} binary requirements`,
    kind: 'action_config',
    required: det.binaryRequirements?.required ?? false,
    collected: det.binaryRequirements?.value !== undefined,
    value: det.binaryRequirements?.value,
  });

  reqs.push({
    field: `action_${index}_dependencies`,
    label: `Action ${index + 1} dependencies`,
    kind: 'action_config',
    required: true,
    collected: det.dependencies?.value !== undefined,
    value: det.dependencies?.value,
  });

  const fields = getNodeSchemaFields(action.type);
  for (const f of fields) {
    const existing = action.config[f.field];
    reqs.push({
      field: `action_${index}_${f.field}`,
      label: `Action ${index + 1} ${f.label}`,
      kind: 'action_config',
      required: f.required,
      collected: existing !== undefined && existing !== null && String(existing).trim().length > 0,
      value: existing !== undefined ? String(existing) : undefined,
    });
  }

  const regEntry = lookupRegistry(action.type);
  if (!nodeRegistry.isRegistered(action.type) && !regEntry) {
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

function buildIntegrationRequirements(
  integrations: WorkflowPlan['integrations'],
  actions: WorkflowPlan['actions']
): WorkflowPlanRequirement[] {
  const reqs: WorkflowPlanRequirement[] = [];

  for (const integration of integrations) {
    reqs.push({
      field: `integration_${integration.type}`,
      label: `Integration: ${integration.name}`,
      kind: 'integration',
      required: false,
      collected: true,
      value: integration.name,
    });
  }

  const actionTypesToIntegration: Record<string, string> = {
    send_email: 'email',
    gmail: 'email',
    google_sheets: 'sheets',
    send_notification: 'slack',
    slack: 'slack',
    telegram: 'telegram',
    supabase: 'database',
    create_record: 'crm',
    update_record: 'crm',
  };

  const neededByAction = new Set<string>();
  for (const action of actions) {
    const integrationType = actionTypesToIntegration[action.type];
    if (integrationType) neededByAction.add(integrationType);
  }

  const presentTypes = new Set<string>(integrations.map((i) => i.type));

  for (const type of neededByAction) {
    if (!presentTypes.has(type)) {
      reqs.push({
        field: `integration_${type}`,
        label: `Integration: ${type}`,
        kind: 'integration',
        required: true,
        collected: false,
      });
    }
  }

  return reqs;
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
  if (field.endsWith('_credentials')) {
    const nodeName = field.replace(/_credentials$/, '').replace(/_/g, ' ');
    return `What credential or connection is required for ${nodeName}?`;
  }
  if (field.endsWith('_provider')) {
    const nodeName = field.replace(/_provider$/, '').replace(/_/g, ' ');
    return `Which service provider is required for ${nodeName}?`;
  }
  if (field.endsWith('_resource')) {
    const nodeName = field.replace(/_resource$/, '').replace(/_/g, ' ');
    return `What resource (e.g. spreadsheet, message) does ${nodeName} act on?`;
  }
  if (field.endsWith('_operation')) {
    const nodeName = field.replace(/_operation$/, '').replace(/_/g, ' ');
    return `What operation (e.g. send, append) should ${nodeName} perform?`;
  }
  if (field.endsWith('_binary_requirements')) {
    const nodeName = field.replace(/_binary_requirements$/, '').replace(/_/g, ' ');
    return `Does ${nodeName} require binary data or file attachments?`;
  }
  if (field.endsWith('_dependencies')) {
    const nodeName = field.replace(/_dependencies$/, '').replace(/_/g, ' ');
    return `What previous steps does ${nodeName} depend on?`;
  }
  if (field.endsWith('_trigger_type')) {
    return 'What trigger type should start this workflow?';
  }

  const clean = field.replace(/^action_\d+_field_/, '').replace(/^action_\d+_(field_)?/, '').replace(/^trigger_field_/, '').replace(/^trigger_/, '');
  return QUESTION_HUMAN_MAP[clean] ?? QUESTION_HUMAN_MAP[field] ?? `What should the "${clean}" be?`;
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

  const nodeType = plan?.trigger?.type ?? plan?.actions?.[0]?.type;
  if (nodeType) {
    const nodeDef = nodeRegistry.getNode(nodeType);
    if (nodeDef?.setupGuide) {
      question.description = `💡 Setup Guide: ${nodeDef.setupGuide.title} - ${nodeDef.setupGuide.steps.join(' ')}`;
    }
  }

  if (req.field === 'trigger_provider' && plan.trigger?.type === 'email_received') {
    question.question = 'Which email provider do you use?';
    question.options = ['Gmail', 'Microsoft Outlook', 'IMAP', 'POP3', 'Exchange', 'Yahoo'];
  }

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
    ...buildIntegrationRequirements(integrations, actions),
    ...buildGeneralRequirements(userPrompt),
  ];

  const questions: WorkflowPlanQuestion[] = [];
  const missing = detectMissingRequirements(requirements);
  for (const req of missing) {
    questions.push(generateNextQuestion({} as any, req));
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
