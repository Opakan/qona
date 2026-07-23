import { describe, it, expect, beforeEach } from 'vitest';
import { nodeRegistry } from '../src/services/node-registry.js';
import { NodeDefinitionSchema } from '@qona/shared';

describe('nodeRegistry', () => {
  beforeEach(() => {
    nodeRegistry.reload();
  });

  describe('getAllNodes', () => {
    it('returns all loaded node definitions', () => {
      const nodes = nodeRegistry.getAllNodes();
      expect(nodes.length).toBeGreaterThanOrEqual(7);
    });

    it('every node passes schema validation', () => {
      const nodes = nodeRegistry.getAllNodes();
      for (const node of nodes) {
        const result = NodeDefinitionSchema.safeParse(node);
        expect(result.success).toBe(true);
      }
    });

    it('all nodes have unique nodeType values', () => {
      const nodes = nodeRegistry.getAllNodes();
      const types = nodes.map((n) => n.nodeType);
      const unique = new Set(types);
      expect(unique.size).toBe(types.length);
    });
  });

  describe('getNode', () => {
    it('returns a node by type', () => {
      const webhook = nodeRegistry.getNode('webhook');
      expect(webhook).toBeDefined();
      expect(webhook!.nodeType).toBe('webhook');
      expect(webhook!.category).toBe('trigger');
    });

    it('returns undefined for unknown type', () => {
      expect(nodeRegistry.getNode('nonexistent')).toBeUndefined();
    });
  });

  describe('getByCategory', () => {
    it('returns only trigger nodes', () => {
      const triggers = nodeRegistry.getByCategory('trigger');
      expect(triggers.length).toBeGreaterThan(0);
      for (const t of triggers) {
        expect(t.category).toBe('trigger');
      }
    });

    it('returns only action nodes', () => {
      const actions = nodeRegistry.getByCategory('action');
      expect(actions.length).toBeGreaterThan(0);
      for (const a of actions) {
        expect(a.category).toBe('action');
      }
    });
  });

  describe('getTriggerTypes / getActionTypes', () => {
    it('getTriggerTypes returns registered triggers', () => {
      const types = nodeRegistry.getTriggerTypes();
      expect(types).toContain('webhook');
    });

    it('getActionTypes returns registered actions', () => {
      const types = nodeRegistry.getActionTypes();
      expect(types).toContain('gmail');
      expect(types).toContain('http_request');
      expect(types).toContain('slack');
    });
  });

  describe('getNodeTypes', () => {
    it('returns all registered type names', () => {
      const types = nodeRegistry.getNodeTypes();
      expect(types.length).toBeGreaterThanOrEqual(7);
      expect(types).toContain('webhook');
      expect(types).toContain('gmail');
    });
  });

  describe('isRegistered', () => {
    it('returns true for registered nodes', () => {
      expect(nodeRegistry.isRegistered('webhook')).toBe(true);
      expect(nodeRegistry.isRegistered('gmail')).toBe(true);
      expect(nodeRegistry.isRegistered('slack')).toBe(true);
      expect(nodeRegistry.isRegistered('telegram')).toBe(true);
      expect(nodeRegistry.isRegistered('google_sheets')).toBe(true);
      expect(nodeRegistry.isRegistered('supabase')).toBe(true);
      expect(nodeRegistry.isRegistered('http_request')).toBe(true);
    });

    it('returns false for unregistered nodes', () => {
      expect(nodeRegistry.isRegistered('nonexistent')).toBe(false);
      expect(nodeRegistry.isRegistered('send_email')).toBe(false);
      expect(nodeRegistry.isRegistered('unknown_action')).toBe(false);
    });
  });

  describe('searchNodes', () => {
    it('finds nodes by display name', () => {
      const results = nodeRegistry.searchNodes('Gmail');
      expect(results.length).toBe(1);
      expect(results[0].nodeType).toBe('gmail');
    });

    it('finds nodes by description', () => {
      const results = nodeRegistry.searchNodes('HTTP requests');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.nodeType === 'http_request')).toBe(true);
    });

    it('finds nodes by keyword', () => {
      const results = nodeRegistry.searchNodes('notify');
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.some((r) => r.nodeType === 'slack')).toBe(true);
      expect(results.some((r) => r.nodeType === 'telegram')).toBe(true);
    });

    it('returns empty array for no match', () => {
      expect(nodeRegistry.searchNodes('zzzz_unknown_xyz')).toHaveLength(0);
    });

    it('search is case-insensitive', () => {
      expect(nodeRegistry.searchNodes('GMAIL').length).toBe(1);
      expect(nodeRegistry.searchNodes('slack').length).toBe(1);
    });
  });

  describe('getRequiredFields', () => {
    it('returns required fields for gmail', () => {
      const fields = nodeRegistry.getRequiredFields('gmail');
      expect(fields.length).toBe(1);
      expect(fields[0].field).toBe('to');
    });

    it('returns empty array for webhook (no required fields)', () => {
      const fields = nodeRegistry.getRequiredFields('webhook');
      expect(fields.length).toBe(0);
    });

    it('returns empty array for unknown type', () => {
      expect(nodeRegistry.getRequiredFields('unknown')).toHaveLength(0);
    });
  });

  describe('getAllFields', () => {
    it('returns combined required and optional fields', () => {
      const fields = nodeRegistry.getAllFields('http_request');
      const fieldNames = fields.map((f) => f.field);
      expect(fieldNames).toContain('url');
      expect(fieldNames).toContain('method');
      expect(fieldNames).toContain('headers');
    });

    it('returns empty array for unknown type', () => {
      expect(nodeRegistry.getAllFields('unknown')).toHaveLength(0);
    });
  });

  describe('buildRegistryContext', () => {
    it('generates a non-empty context string', () => {
      const ctx = nodeRegistry.buildRegistryContext();
      expect(ctx.length).toBeGreaterThan(100);
      expect(ctx).toContain('REGISTERED NODES');
      expect(ctx).toContain('Trigger Nodes');
      expect(ctx).toContain('Action Nodes');
    });

    it('includes all registered node types', () => {
      const ctx = nodeRegistry.buildRegistryContext();
      expect(ctx).toContain('webhook');
      expect(ctx).toContain('gmail');
      expect(ctx).toContain('slack');
      expect(ctx).toContain('telegram');
      expect(ctx).toContain('http_request');
      expect(ctx).toContain('supabase');
      expect(ctx.includes('google-sheets') || ctx.includes('google_sheets')).toBe(true);
    });

    it('includes IMPORTANT RULES section', () => {
      const ctx = nodeRegistry.buildRegistryContext();
      expect(ctx).toContain('IMPORTANT RULES');
      expect(ctx).toContain('Do not invent new types');
    });
  });

  describe('buildTypeList', () => {
    it('returns compact type list', () => {
      const list = nodeRegistry.buildTypeList();
      expect(list).toContain('Triggers:');
      expect(list).toContain('Actions:');
      expect(list).toContain('webhook');
      expect(list).toContain('gmail');
    });
  });

  describe('reload', () => {
    it('returns nodes count after reload', () => {
      const nodes = nodeRegistry.reload();
      expect(nodes.length).toBeGreaterThanOrEqual(7);
    });
  });
});
