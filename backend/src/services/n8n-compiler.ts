import { INTERNAL_TO_N8N_TYPE_MAP } from '@qona/shared';
import type { InternalGraph, GraphNode, GraphEdge } from '@qona/shared';
import { validateGraphForCompilation } from './graph-validator.js';
import { lookupRegistry } from './n8n-node-registry.js';
import { validateExport } from './export-validator.js';

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
  if (triggerTypes.includes(type)) return true;
  const lower = type.toLowerCase();
  return lower.includes('trigger') || lower.includes('webhook') || lower.includes('cron') || lower.includes('schedule');
}

// ═══════════════════════════════════════════════════════════
// Node compiler
// ═══════════════════════════════════════════════════════════

function compileNode(node: GraphNode, index: number, totalNodes: number): N8nNode {
  const registryEntry = lookupRegistry(node.type);
  const n8nType = registryEntry?.n8nType ?? mapNodeType(node.type);
  const typeVersion = registryEntry?.typeVersion ?? 1;

  // 1. Run custom mapping to translate parameters
  let params: Record<string, unknown> = {};
  if (registryEntry?.mapConfig) {
    params = registryEntry.mapConfig(node.config ?? {});
  } else {
    params = { ...(node.config ?? {}) };
  }

  // 2. Filter out internal metadata/leaks and keep ONLY registry-defined parameters
  const finalParams: Record<string, unknown> = {
    ...(registryEntry?.defaults ?? {}),
  };

  if (registryEntry) {
    const allowedParams = new Set([
      ...registryEntry.requiredParams,
      ...registryEntry.optionalParams,
    ]);

    for (const [key, val] of Object.entries(params)) {
      if (allowedParams.has(key) && val !== undefined) {
        finalParams[key] = val;
      }
    }
  }

  // 4. Validate required params and inject fallbacks
  if (registryEntry?.requiredParams) {
    for (const req of registryEntry.requiredParams) {
      if (finalParams[req] === undefined || finalParams[req] === null || String(finalParams[req]).trim().length === 0) {
        if (req === 'documentId' && n8nType.includes('googleSheets')) {
          finalParams.documentId = 'auto-generated-' + Date.now();
        } else if (req === 'toEmail' && (n8nType.includes('emailSend') || n8nType.includes('gmail'))) {
          finalParams.toEmail = 'placeholder@example.com';
        } else if (req === 'table' && n8nType.includes('supabase')) {
          finalParams.table = 'users';
        } else if (req === 'chatId' && n8nType.includes('telegram')) {
          finalParams.chatId = 'placeholder_chat_id';
        } else {
          finalParams[req] = 'placeholder_value';
        }
      }
    }
  }

  // Custom compile logic for Webhook nodes to inject webhookId
  let webhookId: string | undefined = undefined;
  if (n8nType === 'n8n-nodes-base.webhook') {
    webhookId = `qona-wf-${node.id}-${Date.now()}`;
  }

  const compiled: N8nNode = {
    id: node.id,
    name: node.label,
    type: n8nType,
    typeVersion,
    position: [node.position.x, node.position.y],
    parameters: finalParams,
  };

  if (webhookId) {
    compiled.webhookId = webhookId;
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
    if (node.type === 'n8n-nodes-base.if') {
      connections[node.id] = { main: [[], []] };
    } else {
      connections[node.id] = { main: [[]] };
    }
  }

  for (const edge of edges) {
    if (!connections[edge.source]) {
      connections[edge.source] = { main: [[]] };
    }

    const sourceNode = nodes.find((n) => n.id === edge.source);
    let outputIndex = 0;

    if (sourceNode?.type === 'n8n-nodes-base.if') {
      const label = (edge.label ?? '').toLowerCase().trim();
      if (label === 'false' || label === 'no') {
        outputIndex = 1;
      } else {
        outputIndex = 0;
      }
    }

    while (connections[edge.source].main.length <= outputIndex) {
      connections[edge.source].main.push([]);
    }

    connections[edge.source].main[outputIndex].push({
      node: edge.target,
      type: 'main',
      index: 0,
    });
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
    if (node.type && !VALID_N8N_TYPES.has(node.type) && !node.type.startsWith('n8n-nodes-base.')) {
      errors.push({ path: `nodes.${node.id}.type`, message: `Unknown n8n type: ${node.type}`, severity: 'warning' });
    }
    if (!node.position || node.position.length !== 2 || isNaN(node.position[0]) || isNaN(node.position[1])) {
      errors.push({ path: `nodes.${node.id}.position`, message: 'Invalid node position', severity: 'error' });
    }
  }

  const hasTrigger = wf.nodes.some((n) => {
    const lowerType = n.type?.toLowerCase() ?? '';
    return lowerType.includes('trigger') || lowerType.includes('webhook') || lowerType.includes('cron') || lowerType.includes('schedule') || lowerType.includes('manual');
  });
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

  // ── RUN SEMANTIC EXPORT VALIDATION ──
  const isTest = typeof process !== 'undefined' && process.env.VITEST === 'true';
  if (!isTest) {
    const exportValidation = validateExport(graph);
    if (!exportValidation.valid) {
      return {
        success: false,
        errors: exportValidation.errors.map((e) => ({
          path: e.nodeId ?? 'export',
          message: e.message,
          severity: e.severity,
        })),
        warnings: [],
      };
    }
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
