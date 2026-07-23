import { describe, it, expect } from 'vitest';
import { executionSimulator } from '../src/services/execution-simulator/simulator-engine';
import { generateExecutionReport } from '../src/services/execution-simulator/report-generator';
import type { InternalGraph } from '@qona/shared';

describe('generateExecutionReport', () => {
  const sampleGraph: InternalGraph = {
    id: 'graph_report_test_01',
    name: 'AI Article Summarizer & Telegram Alert',
    description: 'Automates article summarization via OpenAI and posts summary to Telegram.',
    version: 1,
    nodes: [
      {
        id: 'node_wh',
        type: 'webhook',
        label: 'Article Webhook',
        category: 'trigger',
        position: { x: 100, y: 100 },
        params: { method: 'POST', path: 'summarize' },
      },
      {
        id: 'node_ai',
        type: 'openai',
        label: 'Summarize Article with AI',
        category: 'action',
        position: { x: 300, y: 100 },
        params: { model: 'gpt-4o-mini' },
      },
      {
        id: 'node_tg',
        type: 'telegram',
        label: 'Post to Telegram',
        category: 'action',
        position: { x: 500, y: 100 },
        params: { chatId: '@mychannel' },
      },
    ],
    edges: [
      { id: 'e1', source: 'node_wh', target: 'node_ai' },
      { id: 'e2', source: 'node_ai', target: 'node_tg' },
    ],
  };

  it('generates a comprehensive execution report with confidence score', () => {
    const trace = executionSimulator.simulateGraph(sampleGraph);
    const report = generateExecutionReport(sampleGraph, trace);

    expect(report).toBeDefined();
    expect(report.confidenceScore).toBeGreaterThanOrEqual(80);
    expect(report.exportReadiness).toBe('READY');
    expect(report.checkmarks.valid).toBe(true);
    expect(report.checkmarks.parametersComplete).toBe(true);
    expect(report.checkmarks.connectionsValid).toBe(true);
    expect(report.checkmarks.exportReady).toBe(true);

    expect(report.trigger).toContain('Article Webhook');
    expect(report.actions).toHaveLength(2);
    expect(report.credentialRequirements.some(c => c.includes('OpenAI API Key'))).toBe(true);
    expect(report.credentialRequirements.some(c => c.includes('Telegram Bot Token'))).toBe(true);
    expect(report.validationResults).toHaveLength(3);
  });
});
