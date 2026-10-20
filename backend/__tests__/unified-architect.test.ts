import { describe, it, expect } from 'vitest';
import { heuristicUnifiedArchitect } from '../src/services/unified-architect.js';

describe('unifiedArchitect heuristic fallback', () => {
  it('generates a complete workflow plan and explanation from a webhook prompt', () => {
    const result = heuristicUnifiedArchitect('When a webhook receives data, send a slack message');
    expect(result.goal).toBeDefined();
    expect(result.trigger).toBeDefined();
    expect(result.trigger.type).toContain('webhook');
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.explanation).toContain('🚀');
    expect(result.singleQuestion.options).toContain('Build & Export n8n Workflow');
    expect(result.isReadyToBuild).toBe(true);
  });

  it('generates a scheduled digest workflow from prompt', () => {
    const result = heuristicUnifiedArchitect('Every day at 9am, fetch google sheets and send email summary');
    expect(result.goal).toBeDefined();
    expect(result.trigger).toBeDefined();
    expect(result.actions.length).toBeGreaterThan(0);
    expect(result.explanation).toContain('### 🚀');
    expect(result.singleQuestion).toBeDefined();
  });

  it('normalizes node types to standard n8n names', () => {
    const result = heuristicUnifiedArchitect('Stripe payment received then notify in Slack');
    expect(result.trigger.type).toMatch(/n8n-nodes-base\./);
    for (const act of result.actions) {
      expect(act.type).toMatch(/n8n-nodes-base\./);
    }
  });

  it('generates dynamic n8n expressions and continueOnFail for Stripe payments', () => {
    const result = heuristicUnifiedArchitect('When a new Stripe payment comes in, notify our team on Slack');
    expect(result.trigger.type).toBe('n8n-nodes-base.stripeTrigger');
    const slackAction = result.actions.find((a) => a.type === 'n8n-nodes-base.slack')!;
    expect(slackAction).toBeDefined();
    expect(String(slackAction.config.message)).toMatch(/^=/);
    expect(slackAction.config.message).toContain('{{ Number($json.data.object.amount)');
    expect(slackAction.config.message).toContain('$json.data.object.customer_details');
    expect(slackAction.config.continueOnFail).toBe(true);
  });

  it('generates parallel fan-out, dynamic expressions, and continueOnFail for Stripe -> Slack + Sheets', () => {
    const result = heuristicUnifiedArchitect(
      'When a new Stripe payment comes in, notify our team on Slack and log to Google Sheets',
    );
    expect(result.trigger.type).toBe('n8n-nodes-base.stripeTrigger');
    expect(result.actions).toHaveLength(2);

    const slack = result.actions.find((a) => a.type === 'n8n-nodes-base.slack')!;
    const sheets = result.actions.find((a) => a.type === 'n8n-nodes-base.googleSheets')!;

    // 1. Parallel fan-out flag on independent sinks
    expect(slack.config.branch).toBe('parallel');
    expect(sheets.config.branch).toBe('parallel');

    // 2. Error resilience on notifications
    expect(slack.config.continueOnFail).toBe(true);

    // 3. Dynamic expressions on both nodes
    expect(String(slack.config.message)).toMatch(/^=/);
    expect(slack.config.message).toContain('{{ Number($json.data.object.amount)');
    expect(sheets.config.columns).toBeDefined();
    const cols = sheets.config.columns as Record<string, string>;
    expect(cols.Date).toContain('{{ $now.toFormat');
    expect(cols.Customer).toContain('{{ $json.data.object');
    expect(cols.Amount).toContain('{{ Number($json.data.object.amount)');

    // Explanation shows parallel fan-out ASCII tree
    expect(result.explanation).toContain('Parallel');
  });

  it('generates dynamic expressions and parallel branching for webhook form submission with Telegram and Airtable', () => {
    const result = heuristicUnifiedArchitect(
      'When a form submission webhook arrives, send a message to telegram and save to airtable',
    );
    expect(result.trigger.type).toMatch(/(form|webhook)/);
    expect(result.actions).toHaveLength(2);

    const telegram = result.actions.find((a) => a.type.includes('telegram'))!;
    const airtable = result.actions.find((a) => a.type.includes('airtable'))!;

    expect(telegram).toBeDefined();
    expect(airtable).toBeDefined();

    // Universal parallel fan-out and resilience
    expect(telegram.config.branch).toBe('parallel');
    expect(airtable.config.branch).toBe('parallel');
    expect(telegram.config.continueOnFail).toBe(true);

    // Dynamic expressions
    expect(String(telegram.config.message)).toMatch(/^=/);
    expect(telegram.config.message).toContain('{{');
  });
});
