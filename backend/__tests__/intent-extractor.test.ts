import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractIntent, IntentExtractionError } from '../src/services/intent-extractor.js';
import { IntentExtractionResultSchema } from '@qona/shared';

vi.mock('../src/services/deepseek.js', async () => {
  const actual = await vi.importActual('../src/services/deepseek.js');
  return { ...actual, chatCompletion: vi.fn() };
});

vi.mock('../src/services/workflow-memory.js', () => ({
  workflowMemory: {
    buildMemoryContext: vi.fn().mockResolvedValue(''),
    findSimilarWorkflows: vi.fn().mockResolvedValue({ matches: [], totalSearched: 0 }),
    storePattern: vi.fn().mockResolvedValue({}),
    logExecution: vi.fn().mockResolvedValue({}),
    getTopSuccessPatterns: vi.fn().mockResolvedValue([]),
  },
}));

let mockChat: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('../src/services/deepseek.js');
  mockChat = vi.mocked(mod.chatCompletion);
});

describe('extractIntent', () => {
  it('extracts webhook trigger + gmail action from simple prompt', async () => {
    mockChat.mockResolvedValue(JSON.stringify({
      trigger: { type: 'webhook', label: 'Webhook', description: 'Receives data' },
      actions: [{ type: 'gmail', label: 'Send Email', order: 1, description: 'Sends email' }],
      integrations: [],
      confidence: 0.9,
      missingDetails: [],
    }));

    const result = await extractIntent('Send an email when a webhook is received');
    expect(result.trigger.type).toBe('webhook');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].type).toBe('gmail');
    expect(result.confidence).toBe(0.9);
  });

  it('extracts schedule trigger with multiple actions', async () => {
    mockChat.mockResolvedValue(JSON.stringify({
      trigger: { type: 'schedule', label: 'Daily Schedule', description: 'Runs daily at 9am', config: { cronExpression: '0 9 * * *' } },
      actions: [
        { type: 'http_request', label: 'Fetch Data', order: 1, description: 'Fetches from API' },
        { type: 'google_sheets', label: 'Update Sheet', order: 2, description: 'Updates spreadsheet' },
      ],
      integrations: [{ name: 'Google Sheets', type: 'sheets', purpose: 'Store report data' }],
      confidence: 0.95,
      missingDetails: [],
    }));

    const result = await extractIntent('Every day at 9am, fetch data from an API and update Google Sheets');
    expect(result.trigger.type).toBe('schedule');
    expect(result.actions).toHaveLength(2);
    expect(result.integrations).toHaveLength(1);
    expect(result.integrations[0].type).toBe('sheets');
  });

  it('reports low confidence for vague prompts', async () => {
    mockChat.mockResolvedValue(JSON.stringify({
      trigger: { type: 'webhook', label: 'Unknown Trigger', description: '' },
      actions: [{ type: 'transform_data', label: 'Process Data', order: 1, description: 'Unclear processing' }],
      integrations: [],
      confidence: 0.3,
      missingDetails: ['What should happen after the trigger?', 'What platform should be used?'],
    }));

    const result = await extractIntent('do something automatically');
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.missingDetails.length).toBeGreaterThan(0);
  });

  it('throws IntentExtractionError on invalid JSON', async () => {
    mockChat.mockResolvedValue('not json at all');

    await expect(extractIntent('a prompt')).rejects.toThrow(IntentExtractionError);
  });

  it('throws on empty prompt', async () => {
    await expect(extractIntent('')).rejects.toThrow(IntentExtractionError);
    await expect(extractIntent('   ')).rejects.toThrow(IntentExtractionError);
  });

  it('validates result matches schema', async () => {
    const valid = {
      trigger: { type: 'webhook', label: 'W' },
      actions: [{ type: 'gmail', label: 'E', order: 1 }],
      integrations: [],
      confidence: 0.5,
      missingDetails: [],
    };

    mockChat.mockResolvedValue(JSON.stringify(valid));

    const result = await extractIntent('valid prompt');
    expect(IntentExtractionResultSchema.safeParse(result).success).toBe(true);
  });

  it('throws IntentExtractionError when schema validation fails', async () => {
    mockChat.mockResolvedValue(JSON.stringify({
      trigger: { type: 'invalid_type', label: 'Bad' },
      actions: [],
      confidence: 0.5,
    }));

    await expect(extractIntent('bad schema')).rejects.toThrow(IntentExtractionError);
  });
});
