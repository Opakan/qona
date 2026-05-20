import { chatCompletion } from './deepseek.js';
import type { WorkflowDefinition } from '@qona/shared';

const VALID_NODE_TYPES = [
  'n8n-nodes-base.webhook', 'n8n-nodes-base.httpRequest', 'n8n-nodes-base.emailSend',
  'n8n-nodes-base.googleSheets', 'n8n-nodes-base.set', 'n8n-nodes-base.if',
  'n8n-nodes-base.noOp', 'n8n-nodes-base.cron', 'n8n-nodes-base.spreadsheetFile',
  'n8n-nodes-base.filter', 'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.respondToWebhook', 'n8n-nodes-base.code',
] as const;

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
}

export interface N8nConnectionMap {
  main: Array<Array<{ node: string; type: string; index: number }>>;
}

export interface N8nWorkflow {
  name: string;
  version: number;
  nodes: N8nNode[];
  connections: Record<string, N8nConnectionMap>;
}

function normalizeNodeType(type: string): string {
  const map: Record<string, string> = {
    webhook: 'n8n-nodes-base.webhook', trigger: 'n8n-nodes-base.webhook',
    http: 'n8n-nodes-base.httpRequest', httpRequest: 'n8n-nodes-base.httpRequest', api: 'n8n-nodes-base.httpRequest',
    email: 'n8n-nodes-base.emailSend', emailSend: 'n8n-nodes-base.emailSend',
    googleSheets: 'n8n-nodes-base.googleSheets', sheets: 'n8n-nodes-base.googleSheets',
    set: 'n8n-nodes-base.set', transform: 'n8n-nodes-base.set', transformData: 'n8n-nodes-base.set',
    if: 'n8n-nodes-base.if', condition: 'n8n-nodes-base.if', conditional: 'n8n-nodes-base.if',
    cron: 'n8n-nodes-base.cron', schedule: 'n8n-nodes-base.cron', scheduleTrigger: 'n8n-nodes-base.cron',
    filter: 'n8n-nodes-base.filter',
    code: 'n8n-nodes-base.code', function: 'n8n-nodes-base.code',
    noOp: 'n8n-nodes-base.noOp', output: 'n8n-nodes-base.noOp', noop: 'n8n-nodes-base.noOp',
    respondToWebhook: 'n8n-nodes-base.respondToWebhook',
  };
  return map[type] ?? type;
}

function normalizeNode(node: Record<string, unknown>): N8nNode {
  const id = (node.id as string) ?? `n${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const label = (node.label as string) ?? (node.name as string) ?? id;
  const pos = node.position as [number, number] | { x: number; y: number } | undefined;
  const position: [number, number] = pos
    ? (Array.isArray(pos) ? pos : [pos.x ?? 200, pos.y ?? 300])
    : [200, 300];

  return {
    id,
    name: label,
    type: normalizeNodeType((node.type as string) ?? 'n8n-nodes-base.noOp'),
    typeVersion: 1,
    position,
    parameters: (node.parameters as Record<string, unknown>) ?? (node.data as Record<string, unknown>) ?? {},
  };
}

function buildConnections(
  nodes: N8nNode[],
  edges: Array<{ source: string; target: string }>,
): Record<string, N8nConnectionMap> {
  const connections: Record<string, N8nConnectionMap> = {};
  for (const node of nodes) {
    connections[node.id] = { main: [[]] };
  }
  for (const edge of edges) {
    if (!connections[edge.source]) {
      connections[edge.source] = { main: [[]] };
    }
    connections[edge.source].main[0].push({ node: edge.target, type: 'main', index: 0 });
  }
  return connections;
}

function validateWorkflow(wf: N8nWorkflow): string[] {
  const errors: string[] = [];
  if (!wf.name) errors.push('Missing workflow name');
  if (!wf.nodes.length) errors.push('No nodes');

  const nodeIds = new Set(wf.nodes.map((n) => n.id));
  const validTypes = new Set<string>(VALID_NODE_TYPES);

  for (const node of wf.nodes) {
    if (!validTypes.has(node.type)) errors.push(`Unknown node type: ${node.type}`);
  }

  const connected = new Set<string>();
  for (const [, data] of Object.entries(wf.connections)) {
    for (const output of data.main) {
      for (const conn of output) {
        if (conn.node && !nodeIds.has(conn.node)) errors.push(`Connection to missing node: ${conn.node}`);
        if (conn.node) connected.add(conn.node);
      }
    }
  }

  const hasTrigger = wf.nodes.some((n) =>
    n.type === 'n8n-nodes-base.webhook' || n.type === 'n8n-nodes-base.cron',
  );
  if (!hasTrigger) errors.push('No trigger node');

  return errors;
}

export async function generateN8nWorkflow(
  definition: WorkflowDefinition,
  retries = 2,
): Promise<N8nWorkflow> {
  const nodes = (definition.nodes ?? []).map(normalizeNode);
  const edges = (definition.edges ?? []) as Array<{ source: string; target: string }>;

  let workflow: N8nWorkflow = {
    name: definition.metadata?.name ?? 'Untitled',
    version: 1,
    nodes,
    connections: buildConnections(nodes, edges),
  };

  const errors = validateWorkflow(workflow);

  if (errors.length > 0 && retries > 0) {
    try {
      const content = await chatCompletion([
        { role: 'system', content: 'Fix this n8n workflow. Return valid JSON with name, nodes, and connections.' },
        { role: 'user', content: `Errors: ${JSON.stringify(errors)}\nWorkflow: ${JSON.stringify(workflow)}` },
      ], { max_tokens: 4000 });

      const fixed = JSON.parse(content);
      workflow = {
        name: fixed.name ?? workflow.name,
        version: 1,
        nodes: (fixed.nodes ?? workflow.nodes).map(normalizeNode),
        connections: fixed.connections ?? workflow.connections,
      };

      const remaining = validateWorkflow(workflow);
      if (remaining.length > 0) return generateN8nWorkflow(definition, retries - 1);
    } catch {
      if (retries > 1) return generateN8nWorkflow(definition, retries - 1);
    }
  }

  return workflow;
}
