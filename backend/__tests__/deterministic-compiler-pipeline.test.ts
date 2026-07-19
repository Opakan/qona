import { describe, it, expect } from 'vitest';
import {
  compileInternalGraph,
  compileToJSON,
  mapNodeType,
  isTriggerNode,
  lookupRegistryEntry,
  resolveNodeParameters,
  deduplicateNodeNames,
  buildConnections,
  validateWorkflowSchema,
  generateWorkflowJSON,
  validateOutput,
} from '../src/services/n8n-compiler.js';
import type { InternalGraph, GraphNode, GraphEdge } from '@qona/shared';

describe('Deterministic Compiler Pipeline', () => {
  // ── Stage 1: Node Registry & Type Mapping ──
  describe('Stage 1: Node Registry & Type Mapping', () => {
    it('maps internal node types to n8n base node types accurately', () => {
      expect(mapNodeType('webhook')).toBe('n8n-nodes-base.webhook');
      expect(mapNodeType('send_email')).toBe('n8n-nodes-base.emailSend');
      expect(mapNodeType('slack')).toBe('n8n-nodes-base.slack');
      expect(mapNodeType('google_sheets')).toBe('n8n-nodes-base.googleSheets');
      expect(mapNodeType('n8n-nodes-base.customNode')).toBe('n8n-nodes-base.customNode');
    });

    it('correctly identifies trigger node types', () => {
      expect(isTriggerNode('webhook')).toBe(true);
      expect(isTriggerNode('schedule')).toBe(true);
      expect(isTriggerNode('cron')).toBe(true);
      expect(isTriggerNode('rss_feed')).toBe(true);
      expect(isTriggerNode('n8n-nodes-base.rssFeedRead')).toBe(true);
      expect(isTriggerNode('send_email')).toBe(false);
      expect(isTriggerNode('slack')).toBe(false);
    });

    it('looks up node registry entries for known nodes', () => {
      const node: GraphNode = {
        id: 'n1',
        type: 'webhook',
        label: 'Webhook',
        position: { x: 100, y: 100 },
        config: { method: 'POST', path: 'test' },
      };
      const entry = lookupRegistryEntry(node);
      expect(entry).toBeDefined();
      expect(entry?.n8nType).toBe('n8n-nodes-base.webhook');
    });
  });

  // ── Stage 2: Parameter Resolver ──
  describe('Stage 2: Parameter Resolver', () => {
    it('resolves parameters cleanly without AI metadata leakage', () => {
      const node: GraphNode = {
        id: 'n1',
        type: 'slack',
        label: 'Slack Notify',
        position: { x: 300, y: 100 },
        config: {
          channel: '#general',
          message: 'Hello World',
          _aiPrompt: 'internal prompt',
          assistantNote: 'should be stripped',
        },
      };
      const entry = lookupRegistryEntry(node);
      const resolved = resolveNodeParameters(node, entry);

      expect(resolved.name).toBe('Slack Notify');
      expect(resolved.type).toBe('n8n-nodes-base.slack');
      expect(resolved.parameters.channel).toBe('#general');
      expect(resolved.parameters.message).toBe('Hello World');
      expect(resolved.parameters._aiPrompt).toBeUndefined();
      expect(resolved.parameters.assistantNote).toBeUndefined();
      expect(resolved.credentials?.slackApi).toBeDefined();
    });

    it('injects fallback placeholders for missing required parameters', () => {
      const node: GraphNode = {
        id: 'n1',
        type: 'google_sheets',
        label: 'Sheet Read',
        position: { x: 200, y: 200 },
        config: { operation: 'readRow' }, // documentId is required
      };
      const entry = lookupRegistryEntry(node);
      const resolved = resolveNodeParameters(node, entry);

      expect(resolved.parameters.documentId).toBe('REPLACE_WITH_SPREADSHEET_ID');
    });
  });

  // ── Stage 3: Connection Builder & Deduplication ──
  describe('Stage 3: Connection Builder & Deduplication', () => {
    it('deduplicates duplicate node labels deterministically', () => {
      const nodes = [
        { id: '1', label: 'Send Alert' },
        { id: '2', label: 'Send Alert' },
        { id: '3', label: 'Send Alert' },
      ];
      const nameMap = deduplicateNodeNames(nodes);
      expect(nameMap.get('1')).toBe('Send Alert');
      expect(nameMap.get('2')).toBe('Send Alert 2');
      expect(nameMap.get('3')).toBe('Send Alert 3');
    });

    it('builds connections keyed by node name and routes If node outputs correctly', () => {
      const compiledNodes = [
        { id: 'n1', name: 'Trigger', type: 'n8n-nodes-base.webhook', typeVersion: 1, position: [0, 0] as [number, number], parameters: {} },
        { id: 'n2', name: 'Check Condition', type: 'n8n-nodes-base.if', typeVersion: 1, position: [200, 0] as [number, number], parameters: {} },
        { id: 'n3', name: 'True Branch', type: 'n8n-nodes-base.slack', typeVersion: 1, position: [400, -100] as [number, number], parameters: {} },
        { id: 'n4', name: 'False Branch', type: 'n8n-nodes-base.slack', typeVersion: 1, position: [400, 100] as [number, number], parameters: {} },
      ];

      const edges: GraphEdge[] = [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3', label: 'true' },
        { id: 'e3', source: 'n2', target: 'n4', label: 'false' },
      ];

      const connections = buildConnections(compiledNodes, edges);

      expect(connections['Trigger'].main[0][0].node).toBe('Check Condition');
      expect(connections['Check Condition'].main[0][0].node).toBe('True Branch');
      expect(connections['Check Condition'].main[1][0].node).toBe('False Branch');
    });
  });

  // ── Stage 4 & 5: Schema Validation & JSON Generation ──
  describe('Stage 4 & 5: Schema Validation & JSON Generator', () => {
    it('validates node parameters against registry schema', () => {
      const compiledNodes = [
        {
          id: 'n1',
          name: 'Telegram Alert',
          type: 'n8n-nodes-base.telegram',
          typeVersion: 1,
          position: [0, 0] as [number, number],
          parameters: { chatId: '12345', parseMode: 'InvalidMode' }, // Invalid parseMode
        },
      ];

      const origNodes: GraphNode[] = [
        { id: 'n1', type: 'telegram', label: 'Telegram Alert', position: { x: 0, y: 0 }, config: { chatId: '12345', parseMode: 'InvalidMode' } },
      ];

      const errors = validateWorkflowSchema(compiledNodes, origNodes);
      expect(errors.some((e) => e.message.includes('parseMode'))).toBe(true);
    });

    it('generates structured n8n workflow output JSON', () => {
      const nodes = [
        { id: 'n1', name: 'Hook', type: 'n8n-nodes-base.webhook', typeVersion: 1, position: [100, 100] as [number, number], parameters: { path: 'test' } },
      ];
      const connections = { Hook: { main: [[]] } };

      const workflow = generateWorkflowJSON(nodes, connections, { name: 'My Flow' });

      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe('My Flow');
      expect(workflow.active).toBe(false);
      expect(workflow.settings).toEqual({ executionOrder: 'v1' });
      expect(workflow.pinData).toEqual({});
      expect(workflow.nodes).toHaveLength(1);
    });
  });

  // ── Full Pipeline: Determinism & Reproducibility ──
  describe('Full Pipeline Determinism', () => {
    const complexGraph: InternalGraph = {
      metadata: { name: 'Deterministic Pipeline Test' },
      nodes: [
        { id: 'n1', type: 'webhook', label: 'Incoming Webhook', position: { x: 100, y: 200 }, config: { method: 'POST', path: 'orders' } },
        { id: 'n2', type: 'filter', label: 'Validate Total', position: { x: 350, y: 200 }, config: { conditions: { number: [{ value1: '={{ $json.total }}', operation: 'larger', value2: 100 }] } } },
        { id: 'n3', type: 'postgres', label: 'Save Order', position: { x: 600, y: 100 }, config: { operation: 'insert', table: 'orders' } },
        { id: 'n4', type: 'slack', label: 'Notify VIP', position: { x: 850, y: 100 }, config: { channel: '#vip-sales', message: 'Big order!' } },
        { id: 'n5', type: 'slack', label: 'Notify Standard', position: { x: 600, y: 300 }, config: { channel: '#orders', message: 'Standard order' } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3', label: 'true' },
        { id: 'e3', source: 'n3', target: 'n4' },
        { id: 'e4', source: 'n2', target: 'n5', label: 'false' },
      ],
    };

    it('produces 100% identical parameters and connection structures across 100 compilations', () => {
      const baseline = compileInternalGraph(complexGraph);
      expect(baseline.success).toBe(true);

      for (let iteration = 1; iteration <= 100; iteration++) {
        const current = compileInternalGraph(complexGraph);
        expect(current.success).toBe(true);
        expect(current.workflow!.name).toBe(baseline.workflow!.name);
        expect(current.workflow!.nodes.length).toBe(baseline.workflow!.nodes.length);

        for (let i = 0; i < current.workflow!.nodes.length; i++) {
          expect(current.workflow!.nodes[i].type).toBe(baseline.workflow!.nodes[i].type);
          expect(current.workflow!.nodes[i].typeVersion).toBe(baseline.workflow!.nodes[i].typeVersion);
          expect(current.workflow!.nodes[i].name).toBe(baseline.workflow!.nodes[i].name);
          expect(current.workflow!.nodes[i].parameters).toEqual(baseline.workflow!.nodes[i].parameters);
        }

        expect(current.workflow!.connections).toEqual(baseline.workflow!.connections);
      }
    });

    it('compileToJSON returns valid JSON string with stable formatting', () => {
      const jsonStr = compileToJSON(complexGraph);
      expect(typeof jsonStr).toBe('string');
      const parsed = JSON.parse(jsonStr);
      expect(parsed.name).toBe('Deterministic Pipeline Test');
      expect(parsed.nodes).toHaveLength(5);
    });
  });
});
