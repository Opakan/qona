import { describe, it, expect } from 'vitest';
import { InternalWorkflowSchema, TriggerTypeSchema, ActionTypeSchema, ConnectionTypeSchema } from '../src/schemas/internal-workflow.js';
import { validateInternalWorkflow, convertInternalToWorkflowDefinition } from '../src/schemas/internal-utils.js';

describe('InternalWorkflowSchema', () => {
  const validTrigger = { id: 't1', type: 'webhook', label: 'Webhook', config: {} };
  const validAction = { id: 'a1', type: 'send_email', label: 'Send Email', config: { to: 'test@test.com', subject: 'Hi' } };
  const validConnection = { id: 'c1', sourceId: 't1', targetId: 'a1', type: 'direct' };

  it('should validate a correct internal workflow', () => {
    const result = InternalWorkflowSchema.safeParse({
      id: 'wf1',
      metadata: { name: 'Test' },
      triggers: [validTrigger],
      actions: [validAction],
      connections: [validConnection],
    });
    expect(result.success).toBe(true);
  });

  it('should reject a workflow with no triggers', () => {
    const result = InternalWorkflowSchema.safeParse({
      id: 'wf1', metadata: { name: 'T' }, triggers: [], actions: [validAction], connections: [],
    });
    expect(result.success).toBe(true);
  });

  it('should validate trigger types', () => {
    expect(TriggerTypeSchema.safeParse('webhook').success).toBe(true);
    expect(TriggerTypeSchema.safeParse('invalid').success).toBe(false);
  });

  it('should validate action types', () => {
    expect(ActionTypeSchema.safeParse('send_email').success).toBe(true);
    expect(ActionTypeSchema.safeParse('invalid').success).toBe(false);
  });

  it('should validate connection types', () => {
    expect(ConnectionTypeSchema.safeParse('direct').success).toBe(true);
    expect(ConnectionTypeSchema.safeParse('conditional').success).toBe(true);
  });
});

describe('validateInternalWorkflow', () => {
  it('should detect missing trigger', () => {
    const result = validateInternalWorkflow({
      id: 'wf1', metadata: { name: 'T' },
      triggers: [], actions: [{ id: 'a1', type: 'send_email', label: 'E', config: {} }], connections: [],
    } as any);
    expect(result.errors.some((e) => e.message.includes('trigger'))).toBe(true);
  });

  it('should detect missing connection reference', () => {
    const result = validateInternalWorkflow({
      id: 'wf1', metadata: { name: 'T' },
      triggers: [{ id: 't1', type: 'webhook', label: 'W', config: {} }],
      actions: [{ id: 'a1', type: 'send_email', label: 'E', config: { to: 'x', subject: 'y' } }],
      connections: [{ id: 'c1', sourceId: 'missing', targetId: 'a1', type: 'direct' }],
    } as any);
    expect(result.errors.some((e) => e.message.includes('does not exist'))).toBe(true);
  });

  it('should detect missing required config', () => {
    const result = validateInternalWorkflow({
      id: 'wf1', metadata: { name: 'T' },
      triggers: [{ id: 't1', type: 'webhook', label: 'W', config: {} }],
      actions: [{ id: 'a1', type: 'send_email', label: 'E', config: {} }],
      connections: [{ id: 'c1', sourceId: 't1', targetId: 'a1', type: 'direct' }],
    } as any);
    expect(result.errors.some((e) => e.message.includes('to'))).toBe(true);
  });
});

describe('convertInternalToWorkflowDefinition', () => {
  it('should convert internal workflow to n8n-compatible format', () => {
    const result = convertInternalToWorkflowDefinition({
      id: 'wf1',
      metadata: { name: 'Test Workflow' },
      triggers: [{ id: 't1', type: 'webhook', label: 'Webhook', config: {} }],
      actions: [{ id: 'a1', type: 'send_email', label: 'Send', config: { to: 'x', subject: 'y' } }],
      connections: [{ id: 'c1', sourceId: 't1', targetId: 'a1', type: 'direct' }],
    } as any);

    expect(result.name).toBe('Test Workflow');
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].type).toBe('n8n-nodes-base.webhook');
    expect(result.nodes[1].type).toBe('n8n-nodes-base.emailSend');
  });
});
