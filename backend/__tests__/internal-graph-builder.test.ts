import { describe, it, expect } from 'vitest';
import { buildInternalGraph, validatePlanForGraphBuild } from '../src/services/internal-graph-builder.js';
import type { WorkflowPlan } from '@qona/shared';

describe('buildInternalGraph', () => {
  const basePlan: WorkflowPlan = {
    goal: 'Send an email when a webhook is received',
    stage: 'building_graph',
    trigger: { type: 'webhook', label: 'Webhook', config: { method: 'POST' } },
    actions: [{ type: 'gmail', label: 'Send Welcome Email', order: 1, config: {} }],
    integrations: [],
    questions: [],
    requirements: [
      { field: 'trigger_type', label: 'Trigger type', kind: 'trigger_config', required: true, collected: true, value: 'webhook' },
      { field: 'to', label: 'Recipient', kind: 'action_config', required: true, collected: true, value: 'user@test.com' },
      { field: 'subject', label: 'Subject', kind: 'action_config', required: true, collected: true, value: 'Welcome' },
    ],
    confidence: 0.9,
  };

  it('builds a valid graph from a complete plan', () => {
    const { graph, warnings } = buildInternalGraph(basePlan);

    expect(graph.nodes.length).toBe(2);
    expect(graph.nodes[0].type).toBe('webhook');
    expect(graph.nodes[1].type).toBe('gmail');
    expect(graph.edges.length).toBeGreaterThanOrEqual(1);
    expect(graph.edges[0].source).toBe(graph.nodes[0].id);
    expect(graph.edges[0].target).toBe(graph.nodes[1].id);
    expect(graph.metadata.name).toBeDefined();
  });

  it('uses a default trigger when plan has no trigger', () => {
    const plan: WorkflowPlan = {
      ...basePlan,
      trigger: undefined,
      requirements: [],
    };
    const { graph, warnings } = buildInternalGraph(plan);

    expect(graph.nodes.some((n) => n.type === 'webhook')).toBe(true);
    expect(warnings.some((w) => w.message.includes('default webhook'))).toBe(true);
  });

  it('uses a default action when plan has no actions', () => {
    const plan: WorkflowPlan = {
      ...basePlan,
      actions: [],
      requirements: [
        { field: 'trigger_type', label: 'Trigger', kind: 'trigger_config', required: true, collected: true, value: 'webhook' },
      ],
    };
    const { graph, warnings } = buildInternalGraph(plan);

    expect(graph.nodes.some((n) => n.type === 'gmail')).toBe(true);
    expect(warnings.some((w) => w.message.includes('No actions defined'))).toBe(true);
  });

  it('maps trigger config from requirements', () => {
    const plan: WorkflowPlan = {
      ...basePlan,
      trigger: { type: 'cron', label: 'Scheduler', config: {} },
      requirements: [
        { field: 'trigger_type', label: 'Trigger', kind: 'trigger_config', required: true, collected: true, value: 'cron' },
        { field: 'cron_expression', label: 'Cron expr', kind: 'trigger_config', required: true, collected: true, value: '0 9 * * *' },
        { field: 'to', label: 'To', kind: 'action_config', required: true, collected: true, value: 'x@y.com' },
        { field: 'subject', label: 'Subject', kind: 'action_config', required: true, collected: true, value: 'Hi' },
      ],
    };
    const { graph } = buildInternalGraph(plan);

    const cronNode = graph.nodes.find((n) => n.type === 'cron');
    expect(cronNode).toBeDefined();
  });

  it('handles multiple actions', () => {
    const plan: WorkflowPlan = {
      ...basePlan,
      actions: [
        { type: 'gmail', label: 'Send Email', order: 1, config: {} },
        { type: 'http_request', label: 'Call API', order: 2, config: {} },
        { type: 'google_sheets', label: 'Update Sheet', order: 3, config: {} },
      ],
      requirements: [
        { field: 'trigger_type', label: 'Trigger', kind: 'trigger_config', required: true, collected: true, value: 'webhook' },
        { field: 'to', label: 'To', kind: 'action_config', required: true, collected: true, value: 'a@b.com' },
        { field: 'subject', label: 'Subject', kind: 'action_config', required: true, collected: true, value: 'Hi' },
        { field: 'url', label: 'URL', kind: 'action_config', required: true, collected: true, value: 'https://api.com' },
        { field: 'spreadsheet_id', label: 'Sheet ID', kind: 'action_config', required: true, collected: true, value: 'abc123' },
      ],
    };
    const { graph } = buildInternalGraph(plan);

    expect(graph.nodes.length).toBe(4);
    expect(graph.edges.length).toBeGreaterThanOrEqual(3);
  });

  it('chains action nodes sequentially', () => {
    const plan: WorkflowPlan = {
      ...basePlan,
      actions: [
        { type: 'gmail', label: 'Email', order: 1, config: {} },
        { type: 'http_request', label: 'API', order: 2, config: {} },
      ],
      requirements: [
        { field: 'trigger_type', label: 'Trigger', kind: 'trigger_config', required: true, collected: true, value: 'webhook' },
        { field: 'to', label: 'To', kind: 'action_config', required: true, collected: true, value: 'x@y.com' },
        { field: 'subject', label: 'Subject', kind: 'action_config', required: true, collected: true, value: 'Hi' },
        { field: 'url', label: 'URL', kind: 'action_config', required: true, collected: true, value: 'https://api.com' },
      ],
    };
    const { graph } = buildInternalGraph(plan);

    const actionNodes = graph.nodes.filter((n) => n.type === 'gmail' || n.type === 'http_request');
    expect(actionNodes.length).toBe(2);

    const chainEdge = graph.edges.find(
      (e) => e.source === actionNodes[0].id && e.target === actionNodes[1].id,
    );
    expect(chainEdge).toBeDefined();
  });

  it('infers trigger types from values', () => {
    const plan: WorkflowPlan = {
      ...basePlan,
      trigger: { type: 'schedule', label: 'Schedule', config: {} },
      actions: [{ type: 'http_request', label: 'API', order: 1, config: {} }],
      requirements: [
        { field: 'trigger_type', label: 'Trigger', kind: 'trigger_config', required: true, collected: true, value: 'schedule' },
        { field: 'cron_expression', label: 'When', kind: 'trigger_config', required: true, collected: true, value: 'daily' },
        { field: 'url', label: 'URL', kind: 'action_config', required: true, collected: true, value: 'https://api.com' },
      ],
    };
    const { graph } = buildInternalGraph(plan);

    expect(graph.nodes[0].type).toBe('schedule');
  });

  it('includes tags for integrations', () => {
    const plan: WorkflowPlan = {
      ...basePlan,
      integrations: [
        { name: 'Gmail', type: 'email', purpose: 'Sending' },
        { name: 'Google Sheets', type: 'sheets', purpose: 'Storage' },
        { name: 'Slack', type: 'slack', purpose: 'Notifications' },
      ],
      requirements: [
        { field: 'trigger_type', label: 'Trigger', kind: 'trigger_config', required: true, collected: true, value: 'webhook' },
        { field: 'to', label: 'To', kind: 'action_config', required: true, collected: true, value: 'x@y.com' },
        { field: 'subject', label: 'Subject', kind: 'action_config', required: true, collected: true, value: 'Hi' },
      ],
    };
    const { graph } = buildInternalGraph(plan);

    expect(graph.metadata.tags).toContain('email');
    expect(graph.metadata.tags).toContain('google-sheets');
    expect(graph.metadata.tags).toContain('slack');
  });
});

describe('validatePlanForGraphBuild', () => {
  it('errors on empty goal', () => {
    const errors = validatePlanForGraphBuild({
      goal: '',
      stage: 'building_graph',
      actions: [],
      integrations: [],
      questions: [],
      requirements: [],
      confidence: 0,
    } as WorkflowPlan);
    expect(errors.some((e) => e.severity === 'error')).toBe(true);
  });

  it('warns when no requirements are collected', () => {
    const errors = validatePlanForGraphBuild({
      goal: 'test',
      stage: 'building_graph',
      actions: [],
      integrations: [],
      questions: [],
      requirements: [],
      confidence: 0,
    } as WorkflowPlan);
    expect(errors.some((e) => e.message.includes('No requirements'))).toBe(true);
  });

  it('warns about unanswered required questions', () => {
    const errors = validatePlanForGraphBuild({
      goal: 'test',
      stage: 'building_graph',
      actions: [],
      integrations: [],
      questions: [
        { id: 'q1', question: 'Test?', field: 'test', severity: 'required', answered: false, affects: 'trigger' },
      ],
      requirements: [{ field: 't', label: 'T', kind: 'general', collected: true }],
      confidence: 0,
    } as WorkflowPlan);
    expect(errors.some((e) => e.path === 'questions')).toBe(true);
  });

  it('passes for a valid plan', () => {
    const errors = validatePlanForGraphBuild({
      goal: 'Test workflow',
      stage: 'building_graph',
      actions: [],
      integrations: [],
      questions: [],
      requirements: [
        { field: 'trigger_type', label: 'Trigger', kind: 'trigger_config', required: true, collected: true, value: 'webhook' },
        { field: 'to', label: 'To', kind: 'action_config', required: true, collected: true, value: 'x@y.com' },
      ],
      confidence: 0.9,
    } as WorkflowPlan);
    const critical = errors.filter((e) => e.severity === 'error');
    expect(critical.length).toBe(0);
  });
});
