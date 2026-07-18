import { describe, it, expect } from 'vitest';
import { validateExport } from '../src/services/export-validator.js';
import type { InternalGraph } from '@qona/shared';

describe('Export Validator', () => {
  it('validates a correct graph successfully', () => {
    const graph: InternalGraph = {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook',
          label: 'Webhook Trigger',
          config: {
            method: 'POST',
            path: 'my-webhook',
          },
          position: { x: 100, y: 100 },
        },
        {
          id: 'action-1',
          type: 'send_email',
          label: 'Send Email Action',
          config: {
            to: 'receiver@example.com',
            subject: 'Dynamic Subject for {{ $node["Webhook Trigger"].json.body.name }}',
          },
          position: { x: 300, y: 100 },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'trigger-1',
          target: 'action-1',
        },
      ],
      metadata: {
        name: 'My Valid Workflow',
      },
    };

    const result = validateExport(graph);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('detects invalid node types', () => {
    const graph: InternalGraph = {
      nodes: [
        {
          id: 'node-1',
          type: 'hallucinated_node_type',
          label: 'Bad Type Node',
          config: {},
          position: { x: 100, y: 100 },
        },
      ],
      edges: [],
      metadata: {},
    };

    const result = validateExport(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('unregistered or invalid type'))).toBe(true);
  });

  it('detects invalid resource and operation values', () => {
    const graph: InternalGraph = {
      nodes: [
        {
          id: 'google-sheets-1',
          type: 'google_sheets',
          label: 'Sheets',
          config: {
            resource: 'invalid_resource',
            operation: 'invalid_operation',
            spreadsheetId: 'sheet123',
            sheetName: 'Sheet1',
          },
          position: { x: 100, y: 100 },
        },
      ],
      edges: [],
      metadata: {},
    };

    const result = validateExport(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('unsupported resource') || e.message.includes('unsupported operation'))).toBe(true);
  });

  it('detects missing required parameters', () => {
    const graph: InternalGraph = {
      nodes: [
        {
          id: 'sheets-1',
          type: 'google_sheets',
          label: 'Google Sheets',
          config: {
            // spreadsheetId is missing
            sheetName: 'Sheet1',
          },
          position: { x: 100, y: 100 },
        },
      ],
      edges: [],
      metadata: {},
    };

    const result = validateExport(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('missing required parameter'))).toBe(true);
  });

  it('detects invalid connections for conditional If nodes', () => {
    const graph: InternalGraph = {
      nodes: [
        {
          id: 'if-1',
          type: 'n8n-nodes-base.if',
          label: 'If Node',
          config: {},
          position: { x: 100, y: 100 },
        },
        {
          id: 'action-1',
          type: 'send_email',
          label: 'Email',
          config: { to: 'a@b.com', subject: 'hi' },
          position: { x: 300, y: 100 },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'if-1',
          target: 'action-1',
          // missing label
        },
      ],
      metadata: {},
    };

    const result = validateExport(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('must have a label'))).toBe(true);
  });

  it('detects expressions referencing non-existent nodes', () => {
    const graph: InternalGraph = {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook',
          label: 'Webhook',
          config: { method: 'POST', path: 'h' },
          position: { x: 100, y: 100 },
        },
        {
          id: 'action-1',
          type: 'send_email',
          label: 'Email',
          config: {
            to: 'a@b.com',
            subject: 'Subject referring to {{ $node["Hallucinated Node"].json.body.data }}',
          },
          position: { x: 300, y: 100 },
        },
      ],
      edges: [
        {
          id: 'e1',
          source: 'trigger-1',
          target: 'action-1',
        },
      ],
      metadata: {},
    };

    const result = validateExport(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('referencing a non-existent node') && e.message.includes('Hallucinated Node'))).toBe(true);
  });

  it('detects orphan nodes', () => {
    const graph: InternalGraph = {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook',
          label: 'Webhook',
          config: { method: 'POST', path: 'h' },
          position: { x: 100, y: 100 },
        },
        {
          id: 'action-1',
          type: 'send_email',
          label: 'Email',
          config: { to: 'a@b.com', subject: 'hi' },
          position: { x: 300, y: 100 },
        },
      ],
      edges: [], // no connections
      metadata: {},
    };

    const result = validateExport(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('orphaned'))).toBe(true);
  });

  it('detects duplicate or invalid node IDs', () => {
    const graph: InternalGraph = {
      nodes: [
        {
          id: 'dup-1',
          type: 'webhook',
          label: 'Webhook',
          config: { method: 'POST', path: 'h' },
          position: { x: 100, y: 100 },
        },
        {
          id: 'dup-1', // duplicate
          type: 'send_email',
          label: 'Email',
          config: { to: 'a@b.com', subject: 'hi' },
          position: { x: 300, y: 100 },
        },
      ],
      edges: [],
      metadata: {},
    };

    const result = validateExport(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Duplicate Node ID'))).toBe(true);
  });

  it('detects unsupported parameters', () => {
    const graph: InternalGraph = {
      nodes: [
        {
          id: 'trigger-1',
          type: 'webhook',
          label: 'Webhook',
          config: {
            method: 'POST',
            path: 'h',
            hallucinated_param: 'some value', // unsupported property
          },
          position: { x: 100, y: 100 },
        },
      ],
      edges: [],
      metadata: {},
    };

    const result = validateExport(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('unsupported property') && e.message.includes('hallucinated_param'))).toBe(true);
  });
});
