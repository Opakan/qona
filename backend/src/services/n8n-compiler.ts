import { INTERNAL_TO_N8N_TYPE_MAP } from '@qona/shared';
import type { InternalGraph, GraphNode, GraphEdge } from '@qona/shared';
import { validateGraphForCompilation } from './graph-validator.js';

// ═══════════════════════════════════════════════════════════
// n8n Output Types
// ═══════════════════════════════════════════════════════════

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  webhookId?: string;
}

export interface N8nConnectionMap {
  main: Array<Array<{ node: string; type: string; index: number }>>;
}

export interface N8nWorkflowOutput {
  name: string;
  version: number;
  nodes: N8nNode[];
  connections: Record<string, N8nConnectionMap>;
  tags?: string[];
}

export interface CompilationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface CompilationResult {
  success: boolean;
  workflow?: N8nWorkflowOutput;
  errors: CompilationError[];
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════
// Node type mapping
// ═══════════════════════════════════════════════════════════

function mapNodeType(internalType: string): string {
  const mapped = INTERNAL_TO_N8N_TYPE_MAP[internalType];
  if (mapped) return mapped;

  if (internalType.startsWith('n8n-nodes-base.')) return internalType;

  return 'n8n-nodes-base.noOp';
}

function isTriggerNode(type: string): boolean {
  const triggerTypes = ['webhook', 'schedule', 'cron', 'manual', 'form_submission', 'email_received', 'payment_received'];
  return triggerTypes.includes(type);
}

// ═══════════════════════════════════════════════════════════
// Node compiler
// ═══════════════════════════════════════════════════════════

function compileNode(node: GraphNode, index: number, totalNodes: number): N8nNode {
  const n8nType = mapNodeType(node.type);

  const params: Record<string, unknown> = { ...(node.config ?? {}) };
  if (n8nType.includes('webhook')) { params.method = params.method || 'POST'; params.path = params.path || '/webhook'; }
  if (n8nType.includes('httpRequest')) { params.method = params.method || 'GET'; params.authentication = 'genericCredentialType'; }
  if (n8nType.includes('googleSheets') && !params.spreadsheetId) { params.spreadsheetId = 'auto-generated-' + Date.now(); }
  if (n8nType.includes('wait') && !params.amount) { params.amount = 1; params.unit = 'minutes'; }
  if (n8nType.includes('emailSend')) { params.fromEmail = params.fromEmail || 'qona@notifications.ai'; }
  const compiled: N8nNode = {
    id: node.id,
    name: node.label,
    type: n8nType,
    typeVersion: 1,
    position: [node.position.x, node.position.y],
    parameters: params,
  };

  if (isTriggerNode(node.type) && n8nType.includes('webhook')) {
    compiled.webhookId = `qona-wf-${node.id}-${Date.now()}`;
    compiled.parameters = {
      ...compiled.parameters,
      authentication: (compiled.parameters as Record<string, unknown>)?.authentication ?? 'none',
      options: { responseMode: 'lastNode', responseData: 'allEntries' },
    };
  }

  if (isTriggerNode(node.type) && n8nType.includes('cron')) {
    compiled.parameters = {
      ...compiled.parameters,
      triggerTimes: {
        item: [{ mode: 'everyMinute', hour: 9, minute: 0 }],
      },
    };
  }

  return compiled;
}

// ═══════════════════════════════════════════════════════════
// Connection compiler
// ═══════════════════════════════════════════════════════════

function compileConnections(
  nodes: N8nNode[],
  edges: GraphEdge[],
): Record<string, N8nConnectionMap> {
  const connections: Record<string, N8nConnectionMap> = {};

  for (const node of nodes) {
    connections[node.id] = { main: [[]] };
  }

  for (const edge of edges) {
    if (!connections[edge.source]) {
      connections[edge.source] = { main: [[]] };
    }

    let outputIndex = 0;

    if (edge.type === 'conditional' && edge.conditions.length > 0) {
      connections[edge.source].main.push([{ node: edge.target, type: 'main', index: 0 }]);
      continue;
    }

    connections[edge.source].main[0].push({ node: edge.target, type: 'main', index: outputIndex });
  }

  return connections;
}

// ═══════════════════════════════════════════════════════════
// Valid output types
// ═══════════════════════════════════════════════════════════

const VALID_N8N_TYPES = new Set([
  'n8n-nodes-base.webhook', 'n8n-nodes-base.httpRequest', 'n8n-nodes-base.emailSend',
  'n8n-nodes-base.googleSheets', 'n8n-nodes-base.set', 'n8n-nodes-base.if',
  'n8n-nodes-base.noOp', 'n8n-nodes-base.cron', 'n8n-nodes-base.spreadsheetFile',
  'n8n-nodes-base.filter', 'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.respondToWebhook', 'n8n-nodes-base.code',
  'n8n-nodes-base.manualTrigger', 'n8n-nodes-base.emailReadImap',
  'n8n-nodes-base.wait', 'n8n-nodes-base.slack',
]);

// ═══════════════════════════════════════════════════════════
// Output validation
// ═══════════════════════════════════════════════════════════

function validateOutput(wf: N8nWorkflowOutput): CompilationError[] {
  const errors: CompilationError[] = [];

  if (!wf.name || wf.name.trim().length === 0) {
    errors.push({ path: 'name', message: 'Workflow name is required', severity: 'error' });
  }

  if (!wf.nodes || wf.nodes.length === 0) {
    errors.push({ path: 'nodes', message: 'Workflow has no nodes', severity: 'error' });
    return errors;
  }

  const nodeIds = new Set(wf.nodes.map((n) => n.id));

  for (const node of wf.nodes) {
    if (!node.id) errors.push({ path: `nodes.${node.id}`, message: 'Node missing id', severity: 'error' });
    if (!node.type) errors.push({ path: `nodes.${node.id}`, message: 'Node missing type', severity: 'error' });
    if (node.type && !VALID_N8N_TYPES.has(node.type)) {
      errors.push({ path: `nodes.${node.id}.type`, message: `Unknown n8n type: ${node.type}`, severity: 'warning' });
    }
    if (!node.position || node.position.length !== 2 || isNaN(node.position[0]) || isNaN(node.position[1])) {
      errors.push({ path: `nodes.${node.id}.position`, message: 'Invalid node position', severity: 'error' });
    }
  }

  const hasTrigger = wf.nodes.some((n) =>
    n.type?.includes('webhook') || n.type?.includes('cron') || n.type?.includes('schedule') || n.type?.includes('manual'),
  );
  if (!hasTrigger) {
    errors.push({ path: 'nodes', message: 'Workflow has no trigger node', severity: 'error' });
  }

  for (const [sourceId, connData] of Object.entries(wf.connections)) {
    if (!nodeIds.has(sourceId)) {
      errors.push({ path: `connections.${sourceId}`, message: `Connection source "${sourceId}" is not a valid node`, severity: 'error' });
    }
    for (const output of connData.main ?? []) {
      for (const conn of output ?? []) {
        if (conn.node && !nodeIds.has(conn.node)) {
          errors.push({ path: `connections.${sourceId}.${conn.node}`, message: `Connection target "${conn.node}" is not a valid node`, severity: 'error' });
        }
      }
    }
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════
// Main compiler function
// ═══════════════════════════════════════════════════════════

export function compileInternalGraph(graph: InternalGraph): CompilationResult {
  const errors: CompilationError[] = [];
  const warnings: string[] = [];

  // ── VALIDATE graph before compilation ──
  const validation = validateGraphForCompilation(graph);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors.map((e) => ({
        path: e.nodeId ?? 'graph',
        message: e.message,
        severity: e.severity,
      })),
      warnings: validation.warnings.map((w) => w.message),
    };
  }

  if (!graph.nodes || graph.nodes.length === 0) {
    return {
      success: false,
      errors: [{ path: 'graph', message: 'Graph has no nodes', severity: 'error' }],
      warnings: [],
    };
  }

  const compiledNodes: N8nNode[] = [];
  const unmappedTypes: string[] = [];

  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    const n8nType = mapNodeType(node.type);

    if (!INTERNAL_TO_N8N_TYPE_MAP[node.type] && !node.type.startsWith('n8n-nodes-base.')) {
      unmappedTypes.push(node.type);
    }

    compiledNodes.push(compileNode(node, i, graph.nodes.length));
  }

  if (unmappedTypes.length > 0) {
    warnings.push(`Unmapped node types: ${unmappedTypes.join(', ')}. These will use 'n8n-nodes-base.noOp'.`);
  }

  const connections = compileConnections(compiledNodes, graph.edges ?? []);

  const workflow: N8nWorkflowOutput = {
    name: graph.metadata.name ?? 'Untitled Workflow',
    version: graph.metadata.version ?? 1,
    nodes: compiledNodes,
    connections,
    tags: graph.metadata.tags ?? ['qona-ai-generated'],
  };

  const outputErrors = validateOutput(workflow);
  errors.push(...outputErrors);

  return {
    success: errors.filter((e) => e.severity === 'error').length === 0,
    workflow: errors.filter((e) => e.severity === 'error').length === 0 ? workflow : undefined,
    errors,
    warnings,
  };
}

export function compileToJSON(graph: InternalGraph): string {
  const result = compileInternalGraph(graph);
  if (!result.workflow) {
    throw new Error(`Compilation failed: ${result.errors.map((e) => e.message).join('; ')}`);
  }
  return JSON.stringify(result.workflow, null, 2);
}
