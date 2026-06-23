import type { InternalGraph, GraphNode, GraphEdge } from '@qona/shared';
import { CREDENTIAL_FIELDS } from '@qona/shared';
import { nodeRegistry } from './node-registry.js';

// ═══════════════════════════════════════════════════════════
// Validation result types
// ═══════════════════════════════════════════════════════════

export interface GraphValidationIssue {
  type: 'orphan_node' | 'missing_trigger' | 'missing_action' | 'circular_dependency' | 'invalid_integration' | 'unregistered_node' | 'empty_graph' | 'broken_edge' | 'credential_field';
  severity: 'error' | 'warning';
  nodeId?: string;
  nodeLabel?: string;
  edgeId?: string;
  message: string;
}

export interface GraphValidationResult {
  valid: boolean;
  errors: GraphValidationIssue[];
  warnings: GraphValidationIssue[];
  summary: {
    nodeCount: number;
    edgeCount: number;
    triggerCount: number;
    actionCount: number;
    orphanCount: number;
    cycleCount: number;
    unregisteredCount: number;
  };
}

// ═══════════════════════════════════════════════════════════
// Known trigger types (node registry + well-known fallbacks)
// ═══════════════════════════════════════════════════════════

const FALLBACK_TRIGGERS = new Set([
  'schedule', 'cron', 'manual',
  'form_submission', 'email_received', 'payment_received',
]);

const TRIGGER_TYPES = new Set([
  ...nodeRegistry.getTriggerTypes(),
  ...FALLBACK_TRIGGERS,
]);

function isTriggerType(type: string): boolean {
  return TRIGGER_TYPES.has(type);
}

// ═══════════════════════════════════════════════════════════
// Check 1: Orphan nodes
// ═══════════════════════════════════════════════════════════

function detectOrphanNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = [];
  const connected = new Set<string>();

  for (const edge of edges) {
    connected.add(edge.source);
    connected.add(edge.target);
  }

  for (const node of nodes) {
    if (!connected.has(node.id)) {
      issues.push({
        type: 'orphan_node',
        severity: 'warning',
        nodeId: node.id,
        nodeLabel: node.label,
        message: `Node "${node.label}" (${node.id}) is orphaned — it has no connections`,
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════
// Check 2: Missing triggers
// ═══════════════════════════════════════════════════════════

function detectMissingTriggers(nodes: GraphNode[]): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = [];
  const hasTrigger = nodes.some((n) => isTriggerType(n.type));

  if (!hasTrigger) {
    issues.push({
      type: 'missing_trigger',
      severity: 'error',
      message: 'No trigger node found. A workflow must have at least one trigger (webhook, schedule, cron, manual, form_submission, etc.)',
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════
// Check 3: Missing actions
// ═══════════════════════════════════════════════════════════

function detectMissingActions(nodes: GraphNode[]): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = [];
  const actionNodes = nodes.filter((n) => !isTriggerType(n.type));

  if (actionNodes.length === 0) {
    issues.push({
      type: 'missing_action',
      severity: 'warning',
      message: 'No action nodes found. A workflow should have at least one action to perform after the trigger.',
    });
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════
// Check 4: Circular dependencies (DFS cycle detection)
// ═══════════════════════════════════════════════════════════

function buildAdjacencyList(edges: GraphEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const neighbors = adj.get(edge.source) ?? [];
    neighbors.push(edge.target);
    adj.set(edge.source, neighbors);
  }
  return adj;
}

function detectCycles(
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = [];
  const adj = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(nodeId: string, path: string[]): boolean {
    visited.add(nodeId);
    inStack.add(nodeId);
    path.push(nodeId);

    try {
      const neighbors = adj.get(nodeId) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, path)) return true;
        } else if (inStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart).concat(neighbor);
          issues.push({
            type: 'circular_dependency',
            severity: 'error',
            message: `Circular dependency detected: ${cycle.join(' → ')}`,
          });
          return true;
        }
      }
      return false;
    } finally {
      path.pop();
      inStack.delete(nodeId);
    }
  }

  const nodeIds = nodes.map((n) => n.id);
  for (const id of nodeIds) {
    if (!visited.has(id)) {
      dfs(id, []);
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════
// Check 5: Invalid integrations / unregistered node types
// ═══════════════════════════════════════════════════════════

function detectUnregisteredNodes(
  nodes: GraphNode[],
  registeredTypes?: Set<string>,
): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = [];

  if (!registeredTypes || registeredTypes.size === 0) return issues;

  for (const node of nodes) {
    if (!registeredTypes.has(node.type)) {
      issues.push({
        type: 'unregistered_node',
        severity: 'warning',
        nodeId: node.id,
        nodeLabel: node.label,
        message: `Node "${node.label}" uses unregistered type "${node.type}" — it may not compile correctly`,
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════
// Broken edge references
// ═══════════════════════════════════════════════════════════

function detectBrokenEdges(
  nodes: GraphNode[],
  edges: GraphEdge[],
): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      issues.push({
        type: 'broken_edge',
        severity: 'error',
        edgeId: edge.id,
        message: `Edge "${edge.id}" references missing source node "${edge.source}"`,
      });
    }
    if (!nodeIds.has(edge.target)) {
      issues.push({
        type: 'broken_edge',
        severity: 'error',
        edgeId: edge.id,
        message: `Edge "${edge.id}" references missing target node "${edge.target}"`,
      });
    }
  }

  return issues;
}

// ═══════════════════════════════════════════════════════════
// Empty graph check
// ═══════════════════════════════════════════════════════════

function detectEmptyGraph(nodes: GraphNode[]): GraphValidationIssue[] {
  if (nodes.length === 0) {
    return [{
      type: 'empty_graph',
      severity: 'error',
      message: 'Graph has no nodes — cannot validate',
    }];
  }
  return [];
}

// ═══════════════════════════════════════════════════════════
// Credential field detection
// ═══════════════════════════════════════════════════════════

function detectCredentialFields(nodes: GraphNode[]): GraphValidationIssue[] {
  const issues: GraphValidationIssue[] = [];

  for (const node of nodes) {
    const config = node.config ?? {};
    for (const key of Object.keys(config)) {
      if (isCredentialKey(key)) {
        const value = config[key];
        const looksReal = typeof value === 'string' && value.length > 10 && !value.startsWith('{{');
        if (looksReal) {
          issues.push({
            type: 'credential_field',
            severity: 'error',
            nodeId: node.id,
            nodeLabel: node.label,
            message: `Node "${node.label}" contains a credential-like field "${key}" with a real-looking value. Credentials must use "{{USER_CONFIGURED}}" placeholders.`,
          });
        }
      }
    }
  }

  return issues;
}

function isCredentialKey(key: string): boolean {
  const lower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return CREDENTIAL_FIELDS.has(lower) ||
    CREDENTIAL_FIELDS.has(key) ||
    lower.includes('token') || lower.includes('secret') ||
    lower.includes('apikey') || lower.includes('password') ||
    lower.includes('privatekey');
}

// ═══════════════════════════════════════════════════════════
// Main validator
// ═══════════════════════════════════════════════════════════

export interface GraphValidatorOptions {
  registeredTypes?: Set<string>;
  strict?: boolean;
}

export function validateGraph(
  graph: InternalGraph,
  options: GraphValidatorOptions = {},
): GraphValidationResult {
  const { registeredTypes, strict = false } = options;
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  const allIssues: GraphValidationIssue[] = [
    ...detectEmptyGraph(nodes),
  ];

  if (allIssues.length > 0) {
    return {
      valid: false,
      errors: allIssues.filter((i) => i.severity === 'error'),
      warnings: allIssues.filter((i) => i.severity === 'warning'),
      summary: { nodeCount: 0, edgeCount: 0, triggerCount: 0, actionCount: 0, orphanCount: 0, cycleCount: 0, unregisteredCount: 0 },
    };
  }

  allIssues.push(...detectBrokenEdges(nodes, edges));
  allIssues.push(...detectMissingTriggers(nodes));
  allIssues.push(...detectMissingActions(nodes));
  allIssues.push(...detectOrphanNodes(nodes, edges));
  allIssues.push(...detectUnregisteredNodes(nodes, registeredTypes));
  allIssues.push(...detectCredentialFields(nodes));

  const cycleIssues = detectCycles(nodes, edges);
  allIssues.push(...cycleIssues);

  const errors = allIssues.filter((i) => i.severity === 'error');
  const warnings = allIssues.filter((i) => i.severity === 'warning');

  const triggerNodes = nodes.filter((n) => isTriggerType(n.type));
  const actionNodes = nodes.filter((n) => !isTriggerType(n.type));

  return {
    valid: strict ? allIssues.length === 0 : errors.length === 0,
    errors,
    warnings,
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      triggerCount: triggerNodes.length,
      actionCount: actionNodes.length,
      orphanCount: warnings.filter((w) => w.type === 'orphan_node').length,
      cycleCount: cycleIssues.length,
      unregisteredCount: warnings.filter((w) => w.type === 'unregistered_node').length,
    },
  };
}

// ═══════════════════════════════════════════════════════════
// Convenience: gateway before n8n compilation
// ═══════════════════════════════════════════════════════════

export function validateGraphForCompilation(
  graph: InternalGraph,
  options?: GraphValidatorOptions,
): GraphValidationResult {
  return validateGraph(graph, { ...options, strict: true });
}

// ═══════════════════════════════════════════════════════════
// Format validation result for user display
// ═══════════════════════════════════════════════════════════

export function formatValidationSummary(result: GraphValidationResult): string {
  const parts: string[] = [];

  parts.push(`Nodes: ${result.summary.nodeCount} | Edges: ${result.summary.edgeCount}`);
  parts.push(`Triggers: ${result.summary.triggerCount} | Actions: ${result.summary.actionCount}`);

  if (result.summary.orphanCount > 0) {
    parts.push(`Orphan nodes: ${result.summary.orphanCount}`);
  }
  if (result.summary.cycleCount > 0) {
    parts.push(`Circular dependencies: ${result.summary.cycleCount}`);
  }
  if (result.summary.unregisteredCount > 0) {
    parts.push(`Unregistered types: ${result.summary.unregisteredCount}`);
  }

  if (result.errors.length > 0) {
    parts.push(`ERRORS: ${result.errors.map((e) => e.message).join('; ')}`);
  }
  if (result.warnings.length > 0) {
    parts.push(`WARNINGS: ${result.warnings.map((w) => w.message).join('; ')}`);
  }

  return parts.join('\n');
}
