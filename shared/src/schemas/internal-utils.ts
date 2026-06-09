import {
  InternalWorkflowSchema,
  InternalWorkflowValidationResultSchema,
  TriggerTypeSchema,
  ActionTypeSchema,
  ConnectionTypeSchema,
} from './internal-workflow.js';
import type { InternalWorkflow, InternalTrigger, InternalAction, InternalConnection } from './internal-workflow.js';

export function validateInternalWorkflow(
  workflow: InternalWorkflow,
): { valid: boolean; errors: Array<{ path: string; message: string; severity: 'error' | 'warning' }> } {
  const errors: Array<{ path: string; message: string; severity: 'error' | 'warning' }> = [];

  const parsed = InternalWorkflowSchema.safeParse(workflow);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
        severity: 'error',
      });
    }
    return { valid: false, errors };
  }

  const wf = parsed.data;

  if (wf.triggers.length === 0) {
    errors.push({ path: 'triggers', message: 'At least one trigger is required', severity: 'error' });
  }

  if (wf.actions.length === 0) {
    errors.push({ path: 'actions', message: 'At least one action is required', severity: 'warning' });
  }

  const allNodeIds = new Set([
    ...wf.triggers.map((t) => t.id),
    ...wf.actions.map((a) => a.id),
  ]);

  for (const conn of wf.connections) {
    if (!allNodeIds.has(conn.sourceId)) {
      errors.push({ path: `connections.${conn.id}.sourceId`, message: `Source node "${conn.sourceId}" does not exist`, severity: 'error' });
    }
    if (!allNodeIds.has(conn.targetId)) {
      errors.push({ path: `connections.${conn.id}.targetId`, message: `Target node "${conn.targetId}" does not exist`, severity: 'error' });
    }
  }

  const connectedSourceIds = new Set(wf.connections.map((c) => c.sourceId));
  for (const trigger of wf.triggers) {
    if (!connectedSourceIds.has(trigger.id)) {
      errors.push({ path: `triggers.${trigger.id}`, message: `Trigger "${trigger.label}" is not connected to any action`, severity: 'warning' });
    }
  }

  for (const action of wf.actions) {
    const requiredConfig = getRequiredActionConfig(action.type);
    for (const field of requiredConfig) {
      if (!(field in action.config)) {
        errors.push({ path: `actions.${action.id}.config.${field}`, message: `Action "${action.label}" is missing required config field: ${field}`, severity: 'error' });
      }
    }
  }

  return { valid: errors.filter((e) => e.severity === 'error').length === 0, errors };
}

function getRequiredActionConfig(type: string): string[] {
  const requirements: Record<string, string[]> = {
    send_email: ['to', 'subject'],
    http_request: ['url', 'method'],
    create_record: [],
    update_record: [],
    transform_data: [],
    filter: ['expression'],
    delay: ['durationMs'],
    send_notification: [],
    run_code: ['code'],
    google_sheets: ['spreadsheetId'],
  };
  return requirements[type] ?? [];
}

export const INTERNAL_TO_N8N_TYPE_MAP: Record<string, string> = {
  webhook: 'n8n-nodes-base.webhook',
  schedule: 'n8n-nodes-base.scheduleTrigger',
  cron: 'n8n-nodes-base.cron',
  manual: 'n8n-nodes-base.manualTrigger',
  form_submission: 'n8n-nodes-base.webhook',
  email_received: 'n8n-nodes-base.emailReadImap',
  payment_received: 'n8n-nodes-base.webhook',
  send_email: 'n8n-nodes-base.emailSend',
  gmail: 'n8n-nodes-base.emailSend',
  http_request: 'n8n-nodes-base.httpRequest',
  transform_data: 'n8n-nodes-base.set',
  filter: 'n8n-nodes-base.if',
  delay: 'n8n-nodes-base.wait',
  create_record: 'n8n-nodes-base.spreadsheetFile',
  update_record: 'n8n-nodes-base.spreadsheetFile',
  send_notification: 'n8n-nodes-base.slack',
  run_code: 'n8n-nodes-base.code',
  google_sheets: 'n8n-nodes-base.googleSheets',
  slack: 'n8n-nodes-base.slack',
  telegram: 'n8n-nodes-base.telegram',
  supabase: 'n8n-nodes-base.supabase',
};

export function convertTriggerToN8nNode(trigger: InternalTrigger) {
  const n8nType = INTERNAL_TO_N8N_TYPE_MAP[trigger.type] ?? 'n8n-nodes-base.webhook';
  const pos = { x: trigger.position?.x ?? 0, y: trigger.position?.y ?? 0 };
  return {
    id: trigger.id,
    name: trigger.label,
    type: n8nType,
    typeVersion: 1,
    position: [pos.x, pos.y] as [number, number],
    parameters: trigger.config ?? {},
  };
}

export function convertActionToN8nNode(action: InternalAction) {
  const n8nType = INTERNAL_TO_N8N_TYPE_MAP[action.type] ?? 'n8n-nodes-base.noOp';
  const pos = { x: action.position?.x ?? 0, y: action.position?.y ?? 0 };
  return {
    id: action.id,
    name: action.label,
    type: n8nType,
    typeVersion: 1,
    position: [pos.x, pos.y] as [number, number],
    parameters: action.config ?? {},
  };
}

export function convertConnectionsToN8nEdges(connections: InternalConnection[]) {
  return connections.map((conn) => ({
    id: conn.id,
    source: conn.sourceId,
    target: conn.targetId,
    sourceHandle: conn.label || undefined,
    label: conn.type === 'conditional' ? 'condition' : undefined,
  }));
}

export function convertInternalToWorkflowDefinition(internalWf: InternalWorkflow) {
  const nodes = [
    ...internalWf.triggers.map(convertTriggerToN8nNode),
    ...internalWf.actions.map(convertActionToN8nNode),
  ];

  const connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> = {};
  for (const node of nodes) {
    connections[node.id] = { main: [[]] };
  }
  for (const conn of internalWf.connections) {
    if (!connections[conn.sourceId]) connections[conn.sourceId] = { main: [[]] };
    connections[conn.sourceId].main[0].push({ node: conn.targetId, type: 'main', index: 0 });
  }

  return {
    name: internalWf.metadata.name,
    nodes,
    connections,
    metadata: {
      name: internalWf.metadata.name,
      description: internalWf.metadata.description,
    },
  };
}
