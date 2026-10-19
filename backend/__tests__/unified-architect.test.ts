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
});
