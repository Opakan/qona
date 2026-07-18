import { describe, it, expect } from 'vitest';
import { compileInternalGraph, compileToJSON } from '../src/services/n8n-compiler.js';

describe('compileInternalGraph', () => {
  it('compiles webhook + send_email graph', () => {
    const result = compileInternalGraph({
      metadata: { name: 'Test Workflow' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Webhook', position: { x: 200, y: 300 }, config: { method: 'POST' } },
        { id: 'n2', type: 'send_email', label: 'Send Email', position: { x: 500, y: 300 }, config: { to: 'x@y.com', subject: 'Hi' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct' }],
    });

    expect(result.success).toBe(true);
    expect(result.workflow).toBeDefined();
    expect(result.workflow!.name).toBe('Test Workflow');
    expect(result.workflow!.nodes).toHaveLength(2);
    expect(result.workflow!.nodes[0].type).toBe('n8n-nodes-base.webhook');
    expect(result.workflow!.nodes[1].type).toBe('n8n-nodes-base.emailSend');
  });

  it('injects webhookId and options on webhook nodes', () => {
    const result = compileInternalGraph({
      metadata: { name: 'Webhook Test' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Webhook', position: { x: 200, y: 300 } },
        { id: 'n2', type: 'http_request', label: 'API', position: { x: 500, y: 300 }, config: { url: 'https://api.com', method: 'GET' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct' }],
    });

    const webhookNode = result.workflow!.nodes[0];
    expect(webhookNode.webhookId).toBeDefined();
    // webhookId is now a proper UUID v4
    expect(webhookNode.webhookId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(webhookNode.parameters.authentication).toBe('none');
    expect(webhookNode.parameters.options).toBeDefined();
  });

  it('compiles cron trigger with default triggerTimes', () => {
    const result = compileInternalGraph({
      metadata: { name: 'Cron Test' },
      nodes: [
        { id: 'n1', type: 'cron', label: 'Daily Task', position: { x: 200, y: 300 } },
        { id: 'n2', type: 'transform_data', label: 'Process', position: { x: 500, y: 300 } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct' }],
    });

    const cronNode = result.workflow!.nodes[0];
    expect(cronNode.type).toBe('n8n-nodes-base.cron');
    expect(cronNode.parameters.triggerTimes).toBeDefined();
  });

  it('marks graph with no nodes as failed', () => {
    const result = compileInternalGraph({
      metadata: { name: 'Empty' },
      nodes: [],
      edges: [],
    });

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.message.includes('no nodes'))).toBe(true);
  });

  it('warns about unmapped node types', () => {
    const result = compileInternalGraph({
      metadata: { name: 'Unknown Types' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'WH', position: { x: 200, y: 300 }, config: {}, connections: [] },
        { id: 'n2', type: 'unknown_service', label: 'Unknown', position: { x: 500, y: 300 }, config: {}, connections: [] },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct', label: '', conditions: [] }],
    });

    expect(result.warnings.some((w) => w.includes('Unmapped'))).toBe(true);
  });

  it('errors when trigger node is missing', () => {
    const result = compileInternalGraph({
      metadata: { name: 'No Trigger' },
      nodes: [
        { id: 'n1', type: 'send_email', label: 'Email', position: { x: 200, y: 300 }, config: { to: 'x', subject: 'y' }, connections: [] },
      ],
      edges: [],
    });

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.message.toLowerCase().includes('trigger'))).toBe(true);
  });

  it('errors on broken edge references', () => {
    const result = compileInternalGraph({
      metadata: { name: 'Bad Edge' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'WH', position: { x: 200, y: 300 } },
        { id: 'n2', type: 'send_email', label: 'E', position: { x: 500, y: 300 }, config: { to: 'x', subject: 'y' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'direct' },
        { id: 'e2', source: 'n1', target: 'nonexistent', type: 'direct' },
      ],
    });

    expect(result.errors.some((e) => e.message.includes('nonexistent'))).toBe(true);
  });

  it('compiles all internal types correctly', () => {
    const result = compileInternalGraph({
      metadata: { name: 'All Types' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'W', position: { x: 0, y: 0 }, config: {}, connections: [] },
        { id: 'n2', type: 'schedule', label: 'S', position: { x: 200, y: 0 }, config: {}, connections: [] },
        { id: 'n3', type: 'cron', label: 'C', position: { x: 400, y: 0 }, config: {}, connections: [] },
        { id: 'n4', type: 'send_email', label: 'E', position: { x: 600, y: 0 }, config: { to: 'x', subject: 'y' }, connections: [] },
        { id: 'n5', type: 'http_request', label: 'H', position: { x: 800, y: 0 }, config: { url: 'a', method: 'GET' }, connections: [] },
        { id: 'n6', type: 'filter', label: 'F', position: { x: 1000, y: 0 }, config: { expression: 'x' }, connections: [] },
        { id: 'n7', type: 'delay', label: 'D', position: { x: 1200, y: 0 }, config: { durationMs: 1000 }, connections: [] },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n4', type: 'direct', label: '', conditions: [] },
        { id: 'e2', source: 'n2', target: 'n4', type: 'direct', label: '', conditions: [] },
        { id: 'e3', source: 'n3', target: 'n4', type: 'direct', label: '', conditions: [] },
        { id: 'e4', source: 'n4', target: 'n5', type: 'direct', label: '', conditions: [] },
        { id: 'e5', source: 'n5', target: 'n6', type: 'direct', label: '', conditions: [] },
        { id: 'e6', source: 'n6', target: 'n7', type: 'direct', label: '', conditions: [] },
      ],
    });

    const types = result.workflow!.nodes.map((n) => n.type);
    expect(types).toContain('n8n-nodes-base.webhook');
    expect(types).toContain('n8n-nodes-base.cron');
    expect(types).toContain('n8n-nodes-base.emailSend');
    expect(types).toContain('n8n-nodes-base.httpRequest');
    expect(types).toContain('n8n-nodes-base.if');
    expect(types).toContain('n8n-nodes-base.wait');
  });

  it('compileToJSON returns valid JSON string', () => {
    const json = compileToJSON({
      metadata: { name: 'JSON Test' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'WH', position: { x: 200, y: 300 } },
        { id: 'n2', type: 'send_email', label: 'E', position: { x: 500, y: 300 }, config: { to: 'x', subject: 'y' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct' }],
    });

    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('JSON Test');
    expect(parsed.nodes).toHaveLength(2);
  });

  it('compileToJSON throws on failed compilation', () => {
    expect(() => compileToJSON({ metadata: { name: 'Bad' }, nodes: [], edges: [] })).toThrow();
  });
});
