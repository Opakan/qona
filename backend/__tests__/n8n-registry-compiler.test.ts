import { describe, it, expect } from 'vitest';
import { compileInternalGraph } from '../src/services/n8n-compiler.js';

describe('Registry-based n8n Compiler', () => {
  it('compiles webhook trigger correctly with mapped parameters and no type leak', () => {
    const result = compileInternalGraph({
      metadata: { name: 'Webhook Test' },
      nodes: [
        {
          id: 'n1',
          type: 'webhook',
          label: 'My Webhook',
          position: { x: 200, y: 200 },
          config: {
            method: 'POST',
            path: 'users-hook',
            type: 'n8n-nodes-base.webhook', // test leakage
          },
        },
        {
          id: 'n2',
          type: 'noOp',
          label: 'NoOp',
          position: { x: 500, y: 200 },
          config: {},
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct' }],
    });

    expect(result.success).toBe(true);
    const nodes = result.workflow!.nodes;
    expect(nodes).toHaveLength(2);

    const webhook = nodes.find((n) => n.id === 'n1')!;
    expect(webhook.type).toBe('n8n-nodes-base.webhook');
    expect(webhook.typeVersion).toBe(1);
    expect(webhook.webhookId).toBeDefined();

    // Verify parameter translation
    expect(webhook.parameters.httpMethod).toBe('POST');
    expect(webhook.parameters.path).toBe('users-hook');
    
    // Verify NO type leaks
    expect(webhook.parameters.type).toBeUndefined();
  });

  it('translates Google Sheets simplified fields and defaults typeVersion', () => {
    const result = compileInternalGraph({
      metadata: { name: 'Sheets Test' },
      nodes: [
        {
          id: 'n1',
          type: 'manual',
          label: 'Manual Trigger',
          position: { x: 200, y: 200 },
          config: {},
        },
        {
          id: 'n2',
          type: 'google_sheets',
          label: 'Add Row',
          position: { x: 500, y: 200 },
          config: {
            spreadsheetId: 'sheet-12345',
            sheetName: 'Subscribers',
            operation: 'append',
            type: 'n8n-nodes-base.googleSheets',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct' }],
    });

    expect(result.success).toBe(true);
    const sheetsNode = result.workflow!.nodes.find((n) => n.id === 'n2')!;
    expect(sheetsNode.type).toBe('n8n-nodes-base.googleSheets');
    expect(sheetsNode.typeVersion).toBe(4);
    
    // Verify mapped parameters
    expect(sheetsNode.parameters.documentId).toBe('sheet-12345');
    expect(sheetsNode.parameters.sheetName).toBe('Subscribers');
    expect(sheetsNode.parameters.operation).toBe('appendRow'); // translated!
    expect(sheetsNode.parameters.spreadsheetId).toBeUndefined();
    expect(sheetsNode.parameters.type).toBeUndefined();
  });

  it('translates Slack channelId/text and Gmail to/body', () => {
    const result = compileInternalGraph({
      metadata: { name: 'Slack Gmail Test' },
      nodes: [
        {
          id: 'n1',
          type: 'manual',
          label: 'Start',
          position: { x: 200, y: 200 },
          config: {},
        },
        {
          id: 'n2',
          type: 'slack',
          label: 'Post message',
          position: { x: 500, y: 200 },
          config: {
            channelId: 'C12345',
            text: 'Hello team!',
          },
        },
        {
          id: 'n3',
          type: 'gmail',
          label: 'Send Gmail',
          position: { x: 800, y: 200 },
          config: {
            to: 'customer@test.com',
            body: 'Your order is ready',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'direct' },
        { id: 'e2', source: 'n2', target: 'n3', type: 'direct' },
      ],
    });

    expect(result.success).toBe(true);
    
    const slack = result.workflow!.nodes.find((n) => n.id === 'n2')!;
    expect(slack.type).toBe('n8n-nodes-base.slack');
    expect(slack.parameters.channel).toBe('C12345');
    expect(slack.parameters.message).toBe('Hello team!');
    expect(slack.parameters.channelId).toBeUndefined();
    expect(slack.parameters.text).toBeUndefined();

    const gmail = result.workflow!.nodes.find((n) => n.id === 'n3')!;
    expect(gmail.type).toBe('n8n-nodes-base.gmail');
    expect(gmail.parameters.toEmail).toBe('customer@test.com');
    expect(gmail.parameters.html).toBe('Your order is ready');
    expect(gmail.parameters.to).toBeUndefined();
    expect(gmail.parameters.body).toBeUndefined();
  });

  it('auto-populates missing required parameters with placeholder values', () => {
    const result = compileInternalGraph({
      metadata: { name: 'Fallback Test' },
      nodes: [
        {
          id: 'n1',
          type: 'manual',
          label: 'Trigger',
          position: { x: 200, y: 200 },
          config: {},
        },
        {
          id: 'n2',
          type: 'google_sheets',
          label: 'Sheets without ID',
          position: { x: 500, y: 200 },
          config: {
            sheetName: 'Tab1',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct' }],
    });

    expect(result.success).toBe(true);
    const sheets = result.workflow!.nodes.find((n) => n.id === 'n2')!;
    expect(sheets.parameters.documentId).toBeDefined();
    expect(String(sheets.parameters.documentId)).toContain('auto-generated-');
  });

  it('strips conversation unregistered fields and unknown parameters completely', () => {
    const result = compileInternalGraph({
      metadata: { name: 'Strips Leaks' },
      nodes: [
        {
          id: 'n1',
          type: 'manual',
          label: 'Trigger',
          position: { x: 200, y: 200 },
          config: {},
        },
        {
          id: 'n2',
          type: 'google_sheets',
          label: 'Sheets',
          position: { x: 500, y: 200 },
          config: {
            spreadsheetId: 'sheet1',
            sheetName: 'Sheet1',
            action_0_unregistered: 'No, wait',
            unregistered: 'Are you done?',
            conversationText: 'Can you append this to Google Sheets?',
            debugField: 'db_trace_123',
            assistantResponse: 'Sure, I will build it.',
            placeholderText: 'Write sheet name here...',
          },
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', type: 'direct' }],
    });

    expect(result.success).toBe(true);
    const sheets = result.workflow!.nodes.find((n) => n.id === 'n2')!;
    expect(sheets.parameters.action_0_unregistered).toBeUndefined();
    expect(sheets.parameters.unregistered).toBeUndefined();
    expect(sheets.parameters.conversationText).toBeUndefined();
    expect(sheets.parameters.debugField).toBeUndefined();
    expect(sheets.parameters.assistantResponse).toBeUndefined();
    expect(sheets.parameters.placeholderText).toBeUndefined();
  });

  it('handles branching If conditional outputs correctly', () => {
    const result = compileInternalGraph({
      metadata: { name: 'If branching' },
      nodes: [
        {
          id: 'n1',
          type: 'manual',
          label: 'Start',
          position: { x: 200, y: 200 },
          config: {},
        },
        {
          id: 'n2',
          type: 'filter',
          label: 'If Node',
          position: { x: 500, y: 200 },
          config: {
            expression: 'value > 100',
          },
        },
        {
          id: 'n3',
          type: 'slack',
          label: 'Slack True Path',
          position: { x: 800, y: 100 },
          config: { channel: 'general', message: 'True' },
        },
        {
          id: 'n4',
          type: 'gmail',
          label: 'Gmail False Path',
          position: { x: 800, y: 300 },
          config: { toEmail: 'x@y.com', html: 'False' },
        },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'direct' },
        { id: 'e2', source: 'n2', target: 'n3', type: 'conditional', label: 'true' },
        { id: 'e3', source: 'n2', target: 'n4', type: 'conditional', label: 'false' },
      ],
    });

    expect(result.success).toBe(true);
    const connections = result.workflow!.connections;
    
    // Verify "If Node" (n2) outputs map to true (port 0) and false (port 1)
    const ifNodeConns = connections['n2'];
    expect(ifNodeConns.main).toHaveLength(2); // must have exactly 2 ports
    
    // Port 0 (true) connects to n3
    expect(ifNodeConns.main[0]).toHaveLength(1);
    expect(ifNodeConns.main[0][0].node).toBe('n3');

    // Port 1 (false) connects to n4
    expect(ifNodeConns.main[1]).toHaveLength(1);
    expect(ifNodeConns.main[1][0].node).toBe('n4');
  });
});
