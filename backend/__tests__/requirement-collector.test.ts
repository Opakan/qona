import { describe, it, expect } from 'vitest';
import { buildInitialPlan, detectMissingRequirements, collectAnswer, generateNextQuestion } from '../src/services/requirement-collector.js';

describe('buildInitialPlan', () => {
  it('builds a plan from extracted intent', () => {
    const plan = buildInitialPlan(
      {
        trigger: { type: 'webhook', label: 'Webhook', description: 'Receives data' },
        actions: [{ type: 'gmail', label: 'Send Email', description: 'Sends email', order: 1 }],
        integrations: [],
        confidence: 0.9,
        missingDetails: [],
      },
      'Send an email when a webhook is received',
    );

    expect(plan.goal).toBe('Send an email when a webhook is received');
    expect(plan.stage).toBe('planning');
    expect(plan.trigger).toBeDefined();
    expect(plan.trigger!.type).toBe('webhook');
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0].type).toBe('gmail');
    expect(plan.confidence).toBe(0.9);
  });

  it('creates trigger requirements', () => {
    const plan = buildInitialPlan(
      {
        trigger: { type: 'webhook', label: 'Webhook', description: '' },
        actions: [{ type: 'gmail', label: 'Email', description: '', order: 1, config: { to: 'test@test.com', subject: 'Hi' } }],
        integrations: [],
        confidence: 0.8,
        missingDetails: [],
      },
      'test',
    );

    const triggerReqs = plan.requirements.filter((r) => r.kind === 'trigger_config');
    expect(triggerReqs.length).toBeGreaterThan(0);
    expect(triggerReqs.some((r) => r.field === 'trigger_type')).toBe(true);
  });

  it('creates action requirements with config fields', () => {
    const plan = buildInitialPlan(
      {
        trigger: { type: 'webhook', label: 'Webhook', description: '', config: {} },
        actions: [{ type: 'gmail', label: 'Email', description: '', order: 1, config: {} }],
        integrations: [],
        confidence: 0.7,
        missingDetails: [],
      },
      'test',
    );

    const actionReqs = plan.requirements.filter((r) => r.kind === 'action_config');
    const toReq = actionReqs.find((r) => r.field === 'action_0_to');
    const subjectReq = actionReqs.find((r) => r.field === 'action_0_subject');

    expect(toReq).toBeDefined();
    expect(toReq!.collected).toBe(false);
    expect(subjectReq).toBeDefined();
    expect(subjectReq!.collected).toBe(false);
  });

  it('marks existing config as collected', () => {
    const plan = buildInitialPlan(
      {
        trigger: { type: 'webhook', label: 'Webhook', description: '', config: {} },
        actions: [{ type: 'gmail', label: 'Email', description: '', order: 1, config: { to: 'user@test.com', subject: 'Welcome' } }],
        integrations: [],
        confidence: 0.95,
        missingDetails: [],
      },
      'test',
    );

    const toReq = plan.requirements.find((r) => r.field === 'action_0_to');
    expect(toReq).toBeDefined();
    expect(toReq!.collected).toBe(true);
    expect(toReq!.value).toBe('user@test.com');
  });

  it('generates general requirements', () => {
    const plan = buildInitialPlan(
      {
        trigger: { type: 'webhook', label: 'W', description: '' },
        actions: [],
        integrations: [],
        confidence: 0.5,
        missingDetails: [],
      },
      'Run a daily report',
    );

    const generalReqs = plan.requirements.filter((r) => r.kind === 'general');
    expect(generalReqs.length).toBeGreaterThanOrEqual(1);
    expect(generalReqs.some((r) => r.field === 'workflow_name')).toBe(true);
  });
});

describe('detectMissingRequirements', () => {
  it('returns only uncollected requirements', () => {
    const missing = detectMissingRequirements([
      { field: 'to', label: 'Recipient', kind: 'action_config' as const, required: true, collected: false },
      { field: 'subject', label: 'Subject', kind: 'action_config' as const, required: true, collected: true, value: 'Hi' },
    ]);

    expect(missing).toHaveLength(1);
    expect(missing[0].field).toBe('to');
  });

  it('returns empty when all collected', () => {
    const missing = detectMissingRequirements([
      { field: 'to', label: 'Recipient', kind: 'action_config' as const, required: true, collected: true, value: 'x@y.com' },
    ]);

    expect(missing).toHaveLength(0);
  });
});

describe('collectAnswer', () => {
  it('marks a requirement as collected with value', () => {
    const plan = buildInitialPlan(
      {
        trigger: { type: 'webhook', label: 'Webhook', description: '', config: {} },
        actions: [{ type: 'gmail', label: 'Email', description: '', order: 1, config: {} }],
        integrations: [],
        confidence: 0.5,
        missingDetails: [],
      },
      'test',
    );

    const updated = collectAnswer(plan, 'action_0_to', 'user@test.com');

    const toReq = updated.requirements.find((r) => r.field === 'action_0_to');
    expect(toReq).toBeDefined();
    expect(toReq!.collected).toBe(true);
    expect(toReq!.value).toBe('user@test.com');
  });

  it('marks a question as answered', () => {
    const plan = buildInitialPlan(
      {
        trigger: { type: 'webhook', label: 'Webhook', description: '', config: {} },
        actions: [{ type: 'gmail', label: 'Email', description: '', order: 1, config: {} }],
        integrations: [],
        confidence: 0.5,
        missingDetails: [],
      },
      'test',
    );

    const updated = collectAnswer(plan, 'action_0_to', 'user@test.com');

    const q = updated.questions.find((q) => q.field === 'action_0_to');
    expect(q).toBeDefined();
    expect(q!.answered).toBe(true);
    expect(q!.answer).toBe('user@test.com');
  });
});

describe('generateNextQuestion', () => {
  const basePlan = {
    goal: 'test',
    stage: 'collecting_requirements' as const,
    actions: [],
    integrations: [],
    questions: [],
    requirements: [],
    confidence: 0,
  };

  it('generates a question for webhook method', () => {
    const q = generateNextQuestion(basePlan, {
      field: 'method',
      label: 'HTTP Method',
      kind: 'trigger_config',
      required: true,
      collected: false,
    });

    expect(q.field).toBe('method');
    expect(q.severity).toBe('required');
    expect(q.options).toBeDefined();
    expect(q.options).toContain('POST');
    expect(q.answered).toBe(false);
  });

  it('generates a question for email recipient', () => {
    const q = generateNextQuestion(basePlan, {
      field: 'to',
      label: 'Recipient',
      kind: 'action_config',
      required: true,
      collected: false,
    });

    expect(q.field).toBe('to');
    expect(q.question).toContain('email');
    expect(q.affects).toBe('action');
  });

  it('generates a question for unknown fields with fallback text', () => {
    const q = generateNextQuestion(basePlan, {
      field: 'custom_setting',
      label: 'Custom Setting',
      kind: 'general',
      required: false,
      collected: false,
    });

    expect(q.field).toBe('custom_setting');
    expect(q.question.length).toBeGreaterThan(0);
  });
});
