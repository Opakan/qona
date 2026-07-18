import type {
  WorkflowPlan,
  InternalGraph,
  GraphNode,
  GraphEdge,
} from '@qona/shared';
import { validateInternalGraph } from '@qona/shared';

// ═══════════════════════════════════════════════════════════
// Infer node types from plan values
// ═══════════════════════════════════════════════════════════

const VALUE_TO_TRIGGER_TYPE: Record<string, string> = {
  webhook: 'webhook', schedule: 'schedule', cron: 'cron',
  manual: 'manual', form: 'form_submission', email: 'email_received',
  payment: 'payment_received',
};

const VALUE_TO_ACTION_TYPE: Record<string, string> = {
  'send email': 'gmail', email: 'gmail', gmail: 'gmail', send_email: 'gmail',
  api: 'http_request', 'api call': 'http_request', 'http request': 'http_request',
  transform: 'transform_data', filter: 'filter', delay: 'delay', wait: 'delay',
  'create record': 'create_record', 'update record': 'update_record',
  notify: 'send_notification', notification: 'send_notification', slack: 'slack',
  telegram: 'telegram',
  code: 'run_code', 'google sheets': 'google_sheets', spreadsheet: 'google_sheets',
  supabase: 'supabase', database: 'supabase', db: 'supabase',
};

function inferTriggerType(value: string): string {
  if (value.startsWith('n8n-nodes-base.')) return value;
  return VALUE_TO_TRIGGER_TYPE[value.trim().toLowerCase()] ?? 'webhook';
}

function inferActionType(value: string): string {
  if (value.startsWith('n8n-nodes-base.')) return value;
  return VALUE_TO_ACTION_TYPE[value.trim().toLowerCase()] ?? value;
}

// ═══════════════════════════════════════════════════════════
// Position layout
// ═══════════════════════════════════════════════════════════

const START_X = 200;
const START_Y = 200;
const COL_GAP = 300;
const ROW_GAP = 120;

function layoutPosition(index: number, total: number, isTrigger: boolean): { x: number; y: number } {
  if (isTrigger) {
    return { x: START_X, y: START_Y + index * ROW_GAP };
  }
  return { x: START_X + COL_GAP, y: START_Y + index * ROW_GAP };
}

// ═══════════════════════════════════════════════════════════
// Requirement to config mapping
// ═══════════════════════════════════════════════════════════

const TRIGGER_FIELD_MAP: Record<string, string> = {
  trigger_type: 'type',
  trigger_method: 'method',
  trigger_path: 'path',
  method: 'method',
  path: 'path',
  schedule_time: 'cronExpression',
  cron_expression: 'cronExpression',
  webhook_method: 'method',
  webhook_path: 'path',
  form_provider: 'formProvider',
  email_account: 'emailAccount',
};

const ACTION_FIELD_MAP: Record<string, string> = {
  action_type: 'type',
  to: 'to',
  subject: 'subject',
  url: 'url',
  expression: 'expression',
  delay_duration: 'durationMs',
  duration: 'durationMs',
  spreadsheet_id: 'spreadsheetId',
  sheet_name: 'sheetName',
  code: 'code',
  template: 'template',
  body: 'body',
  from: 'fromEmail',
  service: 'service',
};

// ═══════════════════════════════════════════════════════════
// Builder
// ═══════════════════════════════════════════════════════════

export interface GraphBuildResult {
  graph: InternalGraph;
  warnings: Array<{ path: string; message: string; severity: 'error' | 'warning' }>;
}

let nodeIdCounter = 0;
function nextNodeId(): string { return `qn${++nodeIdCounter}`; }

export function buildInternalGraph(plan: WorkflowPlan): GraphBuildResult {
  nodeIdCounter = 0;
  const warnings: Array<{ path: string; message: string; severity: 'error' | 'warning' }> = [];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const collected = (plan.requirements ?? []).filter((r) => r.collected);

  // ── Group requirements by target ──
  const triggerReqs = collected.filter((r) => r.kind === 'trigger_config');
  const actionReqs = collected.filter((r) => r.kind === 'action_config');
  const generalReqs = collected.filter((r) => r.kind === 'general');

  // ── Determine name ──
  const nameReq = generalReqs.find((r) => r.field === 'workflow_name');
  const descReq = generalReqs.find((r) => r.field === 'workflow_description');
  const metadata = {
    name: nameReq?.value ?? plan.goal.slice(0, 60) ?? 'My Workflow',
    description: descReq?.value ?? '',
    version: 1,
    tags: [] as string[],
  };

  // ── Build trigger nodes ──
  const triggerNodes: GraphNode[] = [];

  if (plan.trigger) {
    const triggerType = inferTriggerType(plan.trigger.type);
    const nodeId = nextNodeId();
    const config: Record<string, unknown> = { ...plan.trigger.config };

    const metadataKeys = ['provider', 'credentials', 'resource', 'operation', 'binary_requirements', 'dependencies', 'trigger_type'];
    for (const req of triggerReqs) {
      const cleanField = req.field.replace(/^trigger_field_/, '').replace(/^trigger_/, '');
      if (metadataKeys.includes(cleanField)) continue;
      const configKey = TRIGGER_FIELD_MAP[cleanField] ?? cleanField;
      if (req.value !== undefined) config[configKey] = req.value;
    }

    const node: GraphNode = {
      id: nodeId,
      type: triggerType,
      label: plan.trigger.label || 'Trigger',
      description: plan.trigger.description || '',
      position: layoutPosition(0, 1, true),
      config,
      connections: [],
    };
    triggerNodes.push(node);

    // Additional triggers from requirements
    const extraTriggerReqs = triggerReqs.filter((r) => r.field === 'additional_trigger_type');
    for (let i = 0; i < extraTriggerReqs.length; i++) {
      const req = extraTriggerReqs[i];
      const extraType = inferTriggerType(req.value ?? 'webhook');
      const extraNode: GraphNode = {
        id: nextNodeId(),
        type: extraType,
        label: req.value ?? 'Trigger ' + (i + 2),
        description: '',
        position: layoutPosition(i + 1, extraTriggerReqs.length + 1, true),
        config: {},
        connections: [],
      };
      triggerNodes.push(extraNode);
    }
  }

  if (triggerNodes.length === 0) {
    const defaultTrigger: GraphNode = {
      id: nextNodeId(),
      type: 'webhook',
      label: 'Trigger',
      description: 'Default webhook trigger',
      position: layoutPosition(0, 1, true),
      config: { method: 'POST' },
      connections: [],
    };
    triggerNodes.push(defaultTrigger);
    warnings.push({ path: 'trigger', message: 'No trigger defined; using default webhook', severity: 'warning' });
  }

  nodes.push(...triggerNodes);

  // ── Build action nodes ──
  const actionNodes: GraphNode[] = [];

  if (plan.actions.length > 0) {
    for (let i = 0; i < plan.actions.length; i++) {
      const action = plan.actions[i];
      const actionType = inferActionType(action.type) ?? action.type;
      const nodeId = nextNodeId();
      const config: Record<string, unknown> = { ...action.config };

      const relevantReqs = actionReqs.filter((r) => {
        const base = r.field.startsWith(`action_${i}_`) || r.field.startsWith(`actions[${i}]`);
        if (base) return true;
        return !r.field.startsWith('action_') || r.field.startsWith(`action_${i}_`);
      });

      const metadataKeys = ['provider', 'credentials', 'resource', 'operation', 'binary_requirements', 'dependencies', 'trigger_type'];
      for (const req of relevantReqs) {
        const cleanField = req.field.replace(/^action_\d+_field_/, '').replace(/^action_\d+_/, '').replace(/^actions\[\d+\]\.(config\.)?/, '');
        if (metadataKeys.includes(cleanField)) continue;
        const configKey = ACTION_FIELD_MAP[cleanField] ?? cleanField;
        if (req.value !== undefined) config[configKey] = req.value;
      }

      const node: GraphNode = {
        id: nodeId,
        type: actionType,
        label: action.label || 'Action ' + (i + 1),
        description: action.description || '',
        position: layoutPosition(i, plan.actions.length, false),
        config,
        connections: [],
      };
      actionNodes.push(node);
    }
  } else {
    const defaultAction: GraphNode = {
      id: nextNodeId(),
      type: 'gmail',
      label: 'Action',
      description: 'Default action',
      position: layoutPosition(0, 1, false),
      config: { to: '', subject: '' },
      connections: [],
    };
    actionNodes.push(defaultAction);
    warnings.push({ path: 'actions', message: 'No actions defined; using default send_email', severity: 'warning' });
  }

  nodes.push(...actionNodes);

  // ── Build edges: Connect triggers to the first action node only ──
  if (actionNodes.length > 0) {
    for (const triggerNode of triggerNodes) {
      edges.push({
        id: `e-${triggerNode.id}-${actionNodes[0].id}`,
        source: triggerNode.id,
        target: actionNodes[0].id,
        type: 'direct',
        label: '',
        conditions: [],
      });
    }
  }

  // ── Chain action nodes sequentially ──
  for (let i = 0; i < actionNodes.length - 1; i++) {
    edges.push({
      id: `e-${actionNodes[i].id}-${actionNodes[i + 1].id}`,
      source: actionNodes[i].id,
      target: actionNodes[i + 1].id,
      type: 'direct',
      label: '',
      conditions: [],
    });
  }

  // ── Add integration notes ──
  for (const integration of plan.integrations ?? []) {
    if (integration.type === 'email') {
      metadata.tags.push('email');
    } else if (integration.type === 'sheets') {
      metadata.tags.push('google-sheets');
    } else {
      metadata.tags.push(integration.type);
    }
  }

  const graph: InternalGraph = { metadata, nodes, edges };

  // ── Validate ──
  const validation = validateInternalGraph(graph, 'complete');
  for (const err of validation.errors) {
    warnings.push(err);
  }

  return { graph, warnings };
}

export function validatePlanForGraphBuild(plan: WorkflowPlan): Array<{
  path: string; message: string; severity: 'error' | 'warning';
}> {
  const errors: Array<{ path: string; message: string; severity: 'error' | 'warning' }> = [];

  if (!plan.goal || plan.goal.trim().length === 0) {
    errors.push({ path: 'goal', message: 'Workflow plan has no goal', severity: 'error' });
  }

  const collected = (plan.requirements ?? []).filter((r) => r.collected);
  if (collected.length === 0) {
    errors.push({ path: 'requirements', message: 'No requirements collected', severity: 'warning' });
  }

  const unansweredRequired = (plan.questions ?? []).filter(
    (q) => q.severity === 'required' && !q.answered,
  );
  if (unansweredRequired.length > 0) {
    errors.push({
      path: 'questions',
      message: `${unansweredRequired.length} required question(s) unanswered`,
      severity: 'warning',
    });
  }

  return errors;
}
