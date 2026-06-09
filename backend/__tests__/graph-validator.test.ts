import { describe, it, expect } from 'vitest';
import { validateGraph, validateGraphForCompilation, formatValidationSummary, type GraphValidationResult } from '../src/services/graph-validator.js';
import type { InternalGraph } from '@qona/shared';

function makeGraph(overrides: Partial<InternalGraph> = {}): InternalGraph {
  return {
    metadata: { name: 'Test', description: '', version: 1, tags: [] },
    nodes: [],
    edges: [],
    ...overrides,
  };
}

function makeValidGraph(): InternalGraph {
  return {
    metadata: { name: 'Valid Graph' },
    nodes: [
      { id: 'n1', type: 'webhook', label: 'Webhook', position: { x: 0, y: 0 }, config: {}, connections: [] },
      { id: 'n2', type: 'gmail', label: 'Send Email', position: { x: 300, y: 0 }, config: { to: 'x@y.com' }, connections: [] },
      { id: 'n3', type: 'http_request', label: 'Call API', position: { x: 600, y: 0 }, config: { url: 'https://a.com' }, connections: [] },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] },
      { id: 'e2', source: 'n2', target: 'n3', type: 'direct', label: '', conditions: [] },
    ],
  };
}

describe('validateGraph', () => {
  // ═══════════════════════════════════════════════════════
  // Empty graph
  // ═══════════════════════════════════════════════════════

  it('detects empty graph', () => {
    const result = validateGraph(makeGraph());
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.type === 'empty_graph')).toBe(true);
    expect(result.summary.nodeCount).toBe(0);
  });

  // ═══════════════════════════════════════════════════════
  // Valid graph
  // ═══════════════════════════════════════════════════════

  it('validates a correct graph successfully', () => {
    const result = validateGraph(makeValidGraph());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.summary.nodeCount).toBe(3);
    expect(result.summary.triggerCount).toBe(1);
    expect(result.summary.actionCount).toBe(2);
  });

  // ═══════════════════════════════════════════════════════
  // Missing trigger
  // ═══════════════════════════════════════════════════════

  it('detects missing trigger', () => {
    const graph: InternalGraph = {
      metadata: { name: 'No Trigger' },
      nodes: [
        { id: 'n1', type: 'gmail', label: 'Email', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'http_request', label: 'API', position: { x: 300, y: 0 }, config: {}, connections: [] },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] }],
    };
    const result = validateGraph(graph);
    expect(result.errors.some((e) => e.type === 'missing_trigger')).toBe(true);
  });

  // ═══════════════════════════════════════════════════════
  // Missing action (warning only)
  // ═══════════════════════════════════════════════════════

  it('detects missing actions as warning', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Trigger Only' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Webhook', position: { x: 0, y: 0 }, config: {}, connections: [] },
      ],
      edges: [],
    };
    const result = validateGraph(graph);
    expect(result.warnings.some((w) => w.type === 'missing_action')).toBe(true);
    expect(result.valid).toBe(true);
  });

  // ═══════════════════════════════════════════════════════
  // Orphan nodes
  // ═══════════════════════════════════════════════════════

  it('detects orphan nodes', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Orphan' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Webhook', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'gmail', label: 'Email', position: { x: 300, y: 0 }, config: {}, connections: [] },
        { id: 'n3', type: 'http_request', label: 'Orphan API', position: { x: 600, y: 0 }, config: {}, connections: [] },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] },
      ],
    };
    const result = validateGraph(graph);
    expect(result.warnings.some((w) => w.type === 'orphan_node')).toBe(true);
    expect(result.summary.orphanCount).toBe(1);
  });

  it('detects no orphans when all nodes are connected', () => {
    const result = validateGraph(makeValidGraph());
    expect(result.summary.orphanCount).toBe(0);
  });

  // ═══════════════════════════════════════════════════════
  // Broken edges
  // ═══════════════════════════════════════════════════════

  it('detects broken edges referencing missing nodes', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Broken Edge' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'W', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'gmail', label: 'E', position: { x: 300, y: 0 }, config: {}, connections: [] },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] },
        { id: 'e2', source: 'n1', target: 'nonexistent', type: 'direct', label: '', conditions: [] },
        { id: 'e3', source: 'ghost', target: 'n2', type: 'direct', label: '', conditions: [] },
      ],
    };
    const result = validateGraph(graph);
    const broken = result.errors.filter((e) => e.type === 'broken_edge');
    expect(broken.length).toBe(2);
  });

  // ═══════════════════════════════════════════════════════
  // Circular dependencies
  // ═══════════════════════════════════════════════════════

  it('detects simple cycle: A → B → A', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Cycle' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'A', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'gmail', label: 'B', position: { x: 300, y: 0 }, config: {}, connections: [] },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] },
        { id: 'e2', source: 'n2', target: 'n1', type: 'direct', label: '', conditions: [] },
      ],
    };
    const result = validateGraph(graph);
    expect(result.errors.some((e) => e.type === 'circular_dependency')).toBe(true);
    expect(result.summary.cycleCount).toBeGreaterThan(0);
  });

  it('detects longer cycle: A → B → C → A', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Long Cycle' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'A', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'gmail', label: 'B', position: { x: 300, y: 0 }, config: {}, connections: [] },
        { id: 'n3', type: 'http_request', label: 'C', position: { x: 600, y: 0 }, config: {}, connections: [] },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] },
        { id: 'e2', source: 'n2', target: 'n3', type: 'direct', label: '', conditions: [] },
        { id: 'e3', source: 'n3', target: 'n1', type: 'direct', label: '', conditions: [] },
      ],
    };
    const result = validateGraph(graph);
    expect(result.errors.some((e) => e.type === 'circular_dependency')).toBe(true);
  });

  it('no cycles in DAG', () => {
    const result = validateGraph(makeValidGraph());
    expect(result.summary.cycleCount).toBe(0);
  });

  // ═══════════════════════════════════════════════════════
  // Unregistered node types
  // ═══════════════════════════════════════════════════════

  it('detects unregistered node types', () => {
    const registeredTypes = new Set(['webhook', 'gmail', 'http_request']);
    const graph: InternalGraph = {
      metadata: { name: 'Unregistered' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'W', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'unknown_service', label: 'Unknown', position: { x: 300, y: 0 }, config: {}, connections: [] },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] }],
    };
    const result = validateGraph(graph, { registeredTypes });
    expect(result.warnings.some((w) => w.type === 'unregistered_node')).toBe(true);
    expect(result.summary.unregisteredCount).toBe(1);
  });

  it('no unregistered warnings when all types are registered', () => {
    const registeredTypes = new Set(['webhook', 'gmail', 'http_request']);
    const result = validateGraph(makeValidGraph(), { registeredTypes });
    expect(result.summary.unregisteredCount).toBe(0);
  });

  // ═══════════════════════════════════════════════════════
  // Multiple trigger types
  // ═══════════════════════════════════════════════════════

  it('recognizes all trigger types', () => {
    const triggers = ['webhook', 'schedule', 'cron', 'manual', 'form_submission', 'email_received', 'payment_received'];
    for (const type of triggers) {
      const graph: InternalGraph = {
        metadata: { name: type },
        nodes: [
          { id: 'n1', type, label: 'Trigger', position: { x: 0, y: 0 }, config: {}, connections: [] },
          { id: 'n2', type: 'gmail', label: 'Action', position: { x: 300, y: 0 }, config: {}, connections: [] },
        ],
        edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] }],
      };
      const result = validateGraph(graph);
      expect(result.errors.some((e) => e.type === 'missing_trigger')).toBe(false);
      expect(result.summary.triggerCount).toBe(1);
    }
  });
});

describe('credential field detection', () => {
  it('detects real-looking API keys in node config', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Credential Leak' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'W', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'http_request', label: 'API', position: { x: 300, y: 0 }, config: { apiKey: 'sk-real-looking-key-12345abcd', url: 'https://a.com' }, connections: [] },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] }],
    };
    const result = validateGraph(graph);
    expect(result.errors.some((e) => e.type === 'credential_field')).toBe(true);
  });

  it('allows placeholder credential values', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Placeholder' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'W', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'http_request', label: 'API', position: { x: 300, y: 0 }, config: { apiKey: '{{USER_CONFIGURED}}', url: 'https://a.com' }, connections: [] },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] }],
    };
    const result = validateGraph(graph);
    expect(result.errors.some((e) => e.type === 'credential_field')).toBe(false);
  });

  it('detects password fields with real values', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Password Leak' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'W', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'supabase', label: 'DB', position: { x: 300, y: 0 }, config: { password: 'my-real-db-password', tableName: 'users' }, connections: [] },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] }],
    };
    const result = validateGraph(graph);
    expect(result.errors.some((e) => e.type === 'credential_field')).toBe(true);
  });

  it('does not flag short non-credential values', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Safe' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'W', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'http_request', label: 'API', position: { x: 300, y: 0 }, config: { method: 'POST', url: 'https://a.com' }, connections: [] },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] }],
    };
    const result = validateGraph(graph);
    expect(result.errors.some((e) => e.type === 'credential_field')).toBe(false);
  });

  it('detects token fields', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Token Leak' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'W', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'http_request', label: 'API', position: { x: 300, y: 0 }, config: { bearer_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', url: 'https://a.com' }, connections: [] },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] }],
    };
    const result = validateGraph(graph);
    expect(result.errors.some((e) => e.type === 'credential_field')).toBe(true);
  });
});

describe('validateGraphForCompilation', () => {
  it('valid strict graph passes', () => {
    const result = validateGraphForCompilation(makeValidGraph());
    expect(result.valid).toBe(true);
  });

  it('strict mode rejects warnings too', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Strict Fail' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'W', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'gmail', label: 'E', position: { x: 300, y: 0 }, config: {}, connections: [] },
        { id: 'n3', type: 'http_request', label: 'Orphan', position: { x: 600, y: 0 }, config: {}, connections: [] },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] }],
    };
    const result = validateGraphForCompilation(graph);
    expect(result.valid).toBe(false);
    expect(result.warnings.some((w) => w.type === 'orphan_node')).toBe(true);
  });
});

describe('formatValidationSummary', () => {
  it('formats a valid summary', () => {
    const result = validateGraph(makeValidGraph());
    const fmt = formatValidationSummary(result);
    expect(fmt).toContain('Nodes: 3');
    expect(fmt).toContain('Triggers: 1');
    expect(fmt).toContain('Actions: 2');
  });

  it('formats errors and warnings', () => {
    const result = validateGraph(makeGraph());
    const fmt = formatValidationSummary(result);
    expect(fmt).toContain('ERRORS:');
  });
});
