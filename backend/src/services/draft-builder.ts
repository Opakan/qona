import { planningSessionService } from './planning-session.js';
import type { PlanningCollectedAnswer, InternalGraph, GraphNode, GraphEdge } from '@qona/shared';
const FIELD_TO_TRIGGER: Record<string, { field: string; configKey: string }> = {
  trigger_type: { field: "type", configKey: "type" },
  trigger_method: { field: "method", configKey: "method" },
  trigger_path: { field: "path", configKey: "path" },
  'trigger.config.method': { field: "method", configKey: "method" },
  'trigger.config.path': { field: "path", configKey: "path" },
  cron_expression: { field: "cronExpression", configKey: "cronExpression" },
  webhook_method: { field: "method", configKey: "method" },
  webhook_path: { field: "path", configKey: "path" },
};

const FIELD_TO_ACTION: Record<string, { field: string; configKey: string; type?: string }> = {
  action_type: { field: "type", configKey: "type" },
  to: { field: "to", configKey: "to", type: 'send_email' },
  subject: { field: "subject", configKey: "subject", type: 'send_email' },
  url: { field: "url", configKey: "url", type: 'http_request' },
  expression: { field: "expression", configKey: "expression", type: 'filter' },
  delay_duration: { field: "durationMs", configKey: "durationMs", type: 'delay' },
  spreadsheet_id: { field: "spreadsheetId", configKey: "spreadsheetId", type: 'google_sheets' },
};

const ANSWER_TO_TRIGGER_TYPE: Record<string, string> = {
  webhook: 'webhook', schedule: 'schedule', cron: 'cron', manual: 'manual', form: 'form_submission', email: 'email_received', payment: 'payment_received',
};

const ANSWER_TO_ACTION_TYPE: Record<string, string> = {
  'send email': 'send_email', email: 'send_email', api: 'http_request', 'api call': 'http_request', 'http request': 'http_request',
  transform: 'transform_data', filter: 'filter', delay: 'delay', wait: 'delay',
  'create record': 'create_record', 'update record': 'update_record',
  notify: 'send_notification', notification: 'send_notification', slack: 'send_notification',
  code: 'run_code', 'google sheets': 'google_sheets', spreadsheet: 'google_sheets',
};

function inferTriggerType(v: string): string {
  return ANSWER_TO_TRIGGER_TYPE[v.trim().toLowerCase()] ?? 'webhook';
}

function inferActionType(v: string): string | null {
  return ANSWER_TO_ACTION_TYPE[v.trim().toLowerCase()] ?? null;
}

function makeDefaultTrigger() {
  return { id: 'n1', type: 'webhook', label: 'Trigger', description: '',
    position: { x: 200, y: 300 }, config: { method: 'POST' }, connections: ['n2'] };
}

function makeDefaultAction() {
  return { id: 'n2', type: 'send_email', label: 'Action', description: '',
    position: { x: 500, y: 300 }, config: {}, connections: [] };
}

function safeInitNode(nodes: GraphNode[], findFn: (n: GraphNode) => boolean, fallback: () => GraphNode): GraphNode | null {
  const existing = nodes.find(findFn);
  if (existing) return existing;
  if (nodes.length > 50) return null;
  const created = fallback();
  nodes.push(created);
  return created;
}

function safeSetConfig(node: GraphNode | null | undefined, key: string, value: string): void {
  if (!node) return;
  const conf: Record<string, unknown> = node.config ?? {};
  conf[key] = value;
  node.config = conf;
}

export const draftBuilderService = {
  async buildDraft(sessionId: string): Promise<void> {
    const session = await planningSessionService.getById(sessionId);
    if (!session) return;

    const answers = (session.collectedAnswers ?? []) as PlanningCollectedAnswer[];
    const existingDraft = session.workflowDraft as InternalGraph | null;

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    if (existingDraft?.nodes && Array.isArray(existingDraft.nodes)) {
      nodes.push(...existingDraft.nodes);
    }
    if (existingDraft?.edges && Array.isArray(existingDraft.edges)) {
      edges.push(...existingDraft.edges);
    }

    const metadata = existingDraft?.metadata ?? { name: 'My Workflow', description: '', version: 1, tags: [] };

    const triggerTypeKeys = Object.keys(ANSWER_TO_TRIGGER_TYPE);
    const triggerNode = safeInitNode(
      nodes,
      (n) => triggerTypeKeys.includes(n.type) || n.type === 'webhook' || n.type === 'cron',
      makeDefaultTrigger,
    );

    const actionNode = safeInitNode(
      nodes,
      (n) => n.id !== triggerNode?.id && !triggerTypeKeys.includes(n.type),
      makeDefaultAction,
    );
    for (const answer of answers) {
      const { field, value } = answer;
      if (field === 'workflow_name') { metadata.name = value; continue; }
      if (field === 'workflow_description') { metadata.description = value; continue; }

      const triggerMap = FIELD_TO_TRIGGER[field];
      if (triggerMap) {
        if (field === 'trigger_type' && triggerNode) {
          triggerNode.type = inferTriggerType(value);
          triggerNode.label = value.charAt(0).toUpperCase() + value.slice(1) + ' Trigger';
        } else {
          safeSetConfig(triggerNode, triggerMap.configKey, value);
        }
        continue;
      }

      const actionMap = FIELD_TO_ACTION[field];
      if (actionMap && actionNode) {
        if (field === 'action_type') {
          const inferred = inferActionType(value);
          if (inferred) {
            actionNode.type = inferred;
            actionNode.label = value.charAt(0).toUpperCase() + value.slice(1);
          }
        } else {
          safeSetConfig(actionNode, actionMap.configKey, value);
        }
      }
    }
    if (triggerNode && actionNode) {
      const hasEdge = edges.some((e) => e.source === triggerNode.id && e.target === actionNode.id);
      if (!hasEdge) {
        edges.push({
          id: 'e' + triggerNode.id + '-' + actionNode.id,
          source: triggerNode.id,
          target: actionNode.id,
          type: 'direct' as const,
          label: '',
          conditions: [],
        });
      }
    }

    const draft: InternalGraph = { metadata, nodes, edges };
    await planningSessionService.setWorkflowDraft(sessionId, draft);
  },
};
