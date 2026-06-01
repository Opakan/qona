import { describe, it, expect } from 'vitest';
import { InternalGraphSchema, GraphNodeSchema, GraphEdgeSchema, GraphMetadataSchema } from '../src/schemas/internal-graph.js';
import { validateInternalGraph, createEmptyGraph } from '../src/schemas/internal-graph-utils.js';

describe('InternalGraphSchema', () => {
  const validNode = { id: 'n1', type: 'webhook', label: 'Webhook' };
  const validEdge = { id: 'e1', source: 'n1', target: 'n2', type: 'direct' as const };

  it('validates a correct graph', () => {
    const result = InternalGraphSchema.safeParse({
      metadata: { name: 'Test Graph' },
      nodes: [
        validNode,
        { id: 'n2', type: 'http_request', label: 'API Call' },
      ],
      edges: [validEdge],
    });
    expect(result.success).toBe(true);
  });

  it('validates minimum node fields', () => {
    const result = GraphNodeSchema.safeParse({ id: 'n1', type: 'webhook', label: 'Webhook' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.position).toEqual({ x: 0, y: 0 });
      expect(result.data.config).toEqual({});
    }
  });

  it('validates minimum edge fields', () => {
    const result = GraphEdgeSchema.safeParse({ id: 'e1', source: 'n1', target: 'n2' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('direct');
      expect(result.data.conditions).toEqual([]);
    }
  });

  it('validates metadata defaults', () => {
    const result = GraphMetadataSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('');
      expect(result.data.version).toBe(1);
      expect(result.data.tags).toEqual([]);
    }
  });

  it('rejects node without id', () => {
    const result = InternalGraphSchema.safeParse({
      metadata: { name: 'Test' },
      nodes: [{ type: 'webhook', label: 'W' }],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects edge with invalid source', () => {
    const result = InternalGraphSchema.safeParse({
      metadata: { name: 'Test' },
      nodes: [validNode],
      edges: [{ id: 'e1', source: '', target: 'n1', type: 'direct' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('validateInternalGraph', () => {
  it('returns valid for complete graph', () => {
    const result = validateInternalGraph({
      metadata: { name: 'T' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Webhook' },
        { id: 'n2', type: 'http_request', label: 'API' },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct' }],
    });
    expect(result.valid).toBe(true);
  });

  it('returns error for empty nodes', () => {
    const result = validateInternalGraph({
      metadata: { name: 'T' },
      nodes: [],
      edges: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'nodes')).toBe(true);
  });

  it('returns error for broken edge reference', () => {
    const node = { id: 'n1', type: 'webhook', label: 'Webhook' };
    const result = validateInternalGraph({
      metadata: { name: 'T' },
      nodes: [node],
      edges: [{ id: 'e1', source: 'n1', target: 'missing', type: 'direct' as const }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('does not exist'))).toBe(true);
  });

  it('warns about unconnected nodes', () => {
    const result = validateInternalGraph({
      metadata: { name: 'T' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'W' },
        { id: 'n2', type: 'http_request', label: 'API' },
      ],
      edges: [],
    });
    expect(result.errors.some((e) => e.severity === 'warning')).toBe(true);
  });
});

describe('createEmptyGraph', () => {
  it('creates empty graph with defaults', () => {
    const graph = createEmptyGraph('My Graph', 'A test');
    expect(graph.metadata.name).toBe('My Graph');
    expect(graph.metadata.description).toBe('A test');
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });
});
