import { describe, it, expect } from 'vitest';
import { executionSimulator } from '../src/services/execution-simulator/simulator-engine';
import type { InternalGraph } from '@qona/shared';

describe('ExecutionSimulator', () => {
  const sampleGraph: InternalGraph = {
    id: 'graph_sim_test_01',
    name: 'AI Article Summarizer & Telegram Alert',
    description: 'Simulating Webhook -> OpenAI -> Telegram pipeline',
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
        params: { prompt: '={{ $json.body.text }}', model: 'gpt-4o-mini' },
      },
      {
        id: 'node_tg',
        type: 'telegram',
        label: 'Send Telegram Alert',
        category: 'action',
        position: { x: 500, y: 100 },
        params: { chatId: '@mychannel', text: '={{ $json.message.content }}' },
      },
    ],
    edges: [
      { id: 'e1', source: 'node_wh', target: 'node_ai' },
      { id: 'e2', source: 'node_ai', target: 'node_tg' },
    ],
  };

  it('simulates graph execution without calling external APIs', () => {
    const trace = executionSimulator.simulateGraph(sampleGraph);

    expect(trace).toBeDefined();
    expect(trace.status).toBe('success');
    expect(trace.steps.length).toBe(3);
    expect(trace.totalDurationMs).toBeGreaterThan(0);
  });

  it('executes nodes in topological order', () => {
    const trace = executionSimulator.simulateGraph(sampleGraph);

    expect(trace.steps[0].nodeId).toBe('node_wh');
    expect(trace.steps[1].nodeId).toBe('node_ai');
    expect(trace.steps[2].nodeId).toBe('node_tg');
  });

  it('generates mock trigger data and passes payload downstream', () => {
    const trace = executionSimulator.simulateGraph(sampleGraph);

    const triggerStep = trace.steps[0];
    expect(triggerStep.outputData.text).toBe('OpenAI released GPT-5 today.');

    const aiStep = trace.steps[1];
    expect(aiStep.inputData.text).toBe('OpenAI released GPT-5 today.');
    expect(aiStep.outputData.summary).toBe('OpenAI released GPT-5 today.');

    const tgStep = trace.steps[2];
    expect(tgStep.inputData.summary).toBe('OpenAI released GPT-5 today.');
    expect(tgStep.outputData.messageSent).toBe(true);
  });
});
