import { describe, it, expect } from 'vitest';
import { compileInternalGraph } from '../src/services/n8n-compiler.js';
import type { InternalGraph } from '@qona/shared';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMinimalGraph(overrides: Partial<InternalGraph> = {}): InternalGraph {
  return {
    metadata: { name: 'Test Workflow' },
    nodes: [
      {
        id: 'n1',
        type: 'webhook',
        label: 'Webhook',
        position: { x: 100, y: 100 },
        config: {},
      },
      {
        id: 'n2',
        type: 'transform_data',
        label: 'Transform',
        position: { x: 300, y: 100 },
        config: {},
      },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    ...overrides,
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('n8n Schema Conformance', () => {
  it('exported workflow contains all required top-level fields', () => {
    const result = compileInternalGraph(makeMinimalGraph());
    expect(result.success).toBe(true);

    const wf = result.workflow!;
    expect(wf).toHaveProperty('id');
    expect(wf).toHaveProperty('name');
    expect(wf).toHaveProperty('active');
    expect(wf).toHaveProperty('nodes');
    expect(wf).toHaveProperty('connections');
    expect(wf).toHaveProperty('settings');
    expect(wf).toHaveProperty('pinData');
    expect(wf.settings).toEqual({ executionOrder: 'v1' });
    expect(wf.active).toBe(false);
    expect(wf.pinData).toEqual({});
  });

  it('workflow id is a valid UUID v4', () => {
    const result = compileInternalGraph(makeMinimalGraph());
    expect(result.success).toBe(true);
    expect(UUID_REGEX.test(result.workflow!.id)).toBe(true);
  });

  it('connections are keyed by node NAME (not node id)', () => {
    const result = compileInternalGraph(makeMinimalGraph());
    expect(result.success).toBe(true);

    const connectionKeys = Object.keys(result.workflow!.connections);
    // Should contain "Webhook" not "n1"
    expect(connectionKeys).toContain('Webhook');
    expect(connectionKeys).not.toContain('n1');
  });

  it('connection targets use node names not ids', () => {
    const result = compileInternalGraph(makeMinimalGraph());
    expect(result.success).toBe(true);

    const webhookConns = result.workflow!.connections['Webhook'];
    expect(webhookConns).toBeDefined();
    const targets = webhookConns.main[0].map((c) => c.node);
    expect(targets).toContain('Transform');
    expect(targets).not.toContain('n2');
  });

  it('webhook node has a UUID v4 webhookId', () => {
    const result = compileInternalGraph(makeMinimalGraph());
    expect(result.success).toBe(true);

    const webhookNode = result.workflow!.nodes.find((n) => n.type === 'n8n-nodes-base.webhook')!;
    expect(webhookNode).toBeDefined();
    expect(webhookNode.webhookId).toBeDefined();
    expect(UUID_REGEX.test(webhookNode.webhookId!)).toBe(true);
  });

  it('node with required credentials emits credentials stub', () => {
    const graph = makeMinimalGraph({
      nodes: [
        {
          id: 'n1',
          type: 'webhook',
          label: 'Webhook',
          position: { x: 100, y: 100 },
          config: {},
        },
        {
          id: 'n2',
          type: 'n8n-nodes-base.gmail',
          label: 'Send Email',
          position: { x: 300, y: 100 },
          config: { toEmail: 'test@example.com' },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    });

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const gmailNode = result.workflow!.nodes.find((n) => n.type === 'n8n-nodes-base.gmail')!;
    expect(gmailNode).toBeDefined();
    expect(gmailNode.credentials).toBeDefined();
    expect(gmailNode.credentials!['gmailOAuth2']).toBeDefined();
    expect(gmailNode.credentials!['gmailOAuth2'].id).toBeTruthy();
  });

  it('duplicate node labels are auto-suffixed to be unique', () => {
    const graph = makeMinimalGraph({
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Send Email', position: { x: 100, y: 100 }, config: {} },
        { id: 'n2', type: 'transform_data', label: 'Send Email', position: { x: 300, y: 100 }, config: {} },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    });

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const names = result.workflow!.nodes.map((n) => n.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('exported workflow does not contain internal metadata or AI fields', () => {
    const graph = makeMinimalGraph({
      nodes: [
        {
          id: 'n1',
          type: 'webhook',
          label: 'Webhook',
          position: { x: 100, y: 100 },
          config: { _aiNote: 'This is a temp note', provider: 'gmail', debugField: 'foo' },
        },
        {
          id: 'n2',
          type: 'transform_data',
          label: 'Transform',
          position: { x: 300, y: 100 },
          config: {},
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    });

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const webhookParams = result.workflow!.nodes.find((n) => n.type === 'n8n-nodes-base.webhook')!.parameters;
    expect(webhookParams).not.toHaveProperty('_aiNote');
    expect(webhookParams).not.toHaveProperty('provider');
    expect(webhookParams).not.toHaveProperty('debugField');
  });

  it('all node types in exported workflow start with n8n-nodes-base.', () => {
    const result = compileInternalGraph(makeMinimalGraph());
    expect(result.success).toBe(true);

    for (const node of result.workflow!.nodes) {
      expect(node.type).toMatch(/^n8n-nodes-base\./);
    }
  });

  it('google sheets node emits correct typeVersion 4', () => {
    const graph = makeMinimalGraph({
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Webhook', position: { x: 100, y: 100 }, config: {} },
        {
          id: 'n2',
          type: 'google_sheets',
          label: 'Sheets',
          position: { x: 300, y: 100 },
          config: { documentId: 'abc123', sheetName: 'Sheet1' },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    });

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const sheetsNode = result.workflow!.nodes.find((n) => n.type === 'n8n-nodes-base.googleSheets')!;
    expect(sheetsNode.typeVersion).toBe(4);
  });

  it('http request node emits correct typeVersion 4.1', () => {
    const graph = makeMinimalGraph({
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Webhook', position: { x: 100, y: 100 }, config: {} },
        {
          id: 'n2',
          type: 'http_request',
          label: 'HTTP',
          position: { x: 300, y: 100 },
          config: { url: 'https://example.com' },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    });

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const httpNode = result.workflow!.nodes.find((n) => n.type === 'n8n-nodes-base.httpRequest')!;
    expect(httpNode.typeVersion).toBe(4.1);
  });
});
