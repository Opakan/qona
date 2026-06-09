import { describe, it, expect } from 'vitest';
import {
  WorkflowPlanSchema,
  WorkflowPlanStageSchema,
  WorkflowPlanTriggerSchema,
  WorkflowPlanActionSchema,
  WorkflowPlanIntegrationSchema,
  WorkflowPlanQuestionSchema,
  WorkflowPlanRequirementSchema,
} from '../src/schemas/workflow-plan.js';

describe('WorkflowPlanSchema', () => {
  it('validates a minimal plan', () => {
    const result = WorkflowPlanSchema.safeParse({
      goal: 'Send an email when a webhook is received',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stage).toBe('extracting_intent');
      expect(result.data.actions).toHaveLength(0);
      expect(result.data.questions).toHaveLength(0);
      expect(result.data.requirements).toHaveLength(0);
      expect(result.data.confidence).toBe(0);
    }
  });

  it('validates a full plan with trigger and actions', () => {
    const result = WorkflowPlanSchema.safeParse({
      goal: 'Send an email when a form is submitted',
      stage: 'planning',
      trigger: { type: 'webhook', label: 'Webhook', description: 'Receives data' },
      actions: [{ type: 'send_email', label: 'Send Email', order: 1 }],
      integrations: [{ name: 'Gmail', type: 'email', purpose: 'Sending' }],
      questions: [],
      requirements: [
        { field: 'trigger_type', label: 'Trigger type', kind: 'trigger_config', collected: true, value: 'webhook' },
      ],
      confidence: 0.9,
    });
    expect(result.success).toBe(true);
  });

  it('rejects plans with empty goal', () => {
    const result = WorkflowPlanSchema.safeParse({ goal: '' });
    expect(result.success).toBe(false);
  });

  it('validates all plan stages', () => {
    const stages = ['extracting_intent', 'planning', 'collecting_requirements', 'building_graph', 'compiling', 'completed', 'failed'];
    for (const stage of stages) {
      expect(WorkflowPlanStageSchema.safeParse(stage).success).toBe(true);
    }
    expect(WorkflowPlanStageSchema.safeParse('invalid_stage').success).toBe(false);
  });

  it('validates plan with questions', () => {
    const result = WorkflowPlanSchema.safeParse({
      goal: 'Test workflow',
      questions: [
        { id: 'q1', question: 'What triggers this?', field: 'trigger_type', severity: 'required', answered: false, affects: 'trigger' },
        { id: 'q2', question: 'What email recipient?', field: 'to', severity: 'required', answered: true, answer: 'user@test.com', affects: 'action' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.questions).toHaveLength(2);
      expect(result.data.questions[0].answered).toBe(false);
      expect(result.data.questions[1].answered).toBe(true);
      expect(result.data.questions[1].answer).toBe('user@test.com');
    }
  });

  it('validates requirements with collected state', () => {
    const result = WorkflowPlanSchema.safeParse({
      goal: 'Test',
      requirements: [
        { field: 'to', label: 'Recipient', kind: 'action_config', required: true, collected: false },
        { field: 'subject', label: 'Subject', kind: 'action_config', required: true, collected: true, value: 'Welcome' },
        { field: 'workflow_name', label: 'Name', kind: 'general', required: false, collected: false },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid integration type', () => {
    const result = WorkflowPlanSchema.safeParse({
      goal: 'Test',
      integrations: [{ name: 'Unknown', type: 'invalid_type', purpose: 'Test' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid integration types', () => {
    const valid = ['email', 'crm', 'sheets', 'slack', 'api', 'database', 'payment', 'storage', 'custom'];
    for (const type of valid) {
      const result = WorkflowPlanIntegrationSchema.safeParse({ name: 'Test', type, purpose: 'Test' });
      expect(result.success).toBe(true);
    }
  });

  it('sets correct defaults on question', () => {
    const result = WorkflowPlanQuestionSchema.safeParse({
      id: 'q1', question: 'Test?', field: 'test', affects: 'trigger',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.severity).toBe('required');
      expect(result.data.answered).toBe(false);
    }
  });
});
