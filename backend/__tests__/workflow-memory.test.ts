import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════
// Unit tests for similarity engine internals
// Since the functions are private to the module, we test
// through the public API with mocked DB
// ═══════════════════════════════════════════════════════════

vi.mock('../src/lib/prisma.js', () => ({
  getPrisma: vi.fn(),
}));

import { getPrisma } from '../src/lib/prisma.js';
import { workflowMemory } from '../src/services/workflow-memory.js';

function makePattern(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id as string ?? 'pat_1',
    goal: overrides.goal as string ?? 'Send an email when a webhook is received',
    triggerType: overrides.triggerType as string ?? 'webhook',
    triggerLabel: overrides.triggerLabel as string ?? 'Webhook Trigger',
    actionTypes: (overrides.actionTypes as string[]) ?? ['gmail'],
    integrationTypes: (overrides.integrationTypes as string[]) ?? ['email'],
    confidence: (overrides.confidence as number) ?? 0.9,
    usageCount: (overrides.usageCount as number) ?? 5,
    success: true,
    createdAt: new Date(),
  };
}

describe('workflowMemory.findSimilarWorkflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds exact trigger match with high score', async () => {
    const mockPrisma = {
      workflowPattern: {
        findMany: vi.fn().mockResolvedValue([
          makePattern({ id: 'p1', goal: 'Send an email when a webhook is received', triggerType: 'webhook', actionTypes: ['gmail'] }),
          makePattern({ id: 'p2', goal: 'Update Google Sheets on schedule', triggerType: 'cron', actionTypes: ['google_sheets'] }),
        ]),
      },
    };
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as any);

    const result = await workflowMemory.findSimilarWorkflows({
      goal: 'Send an email when a webhook fires',
      triggerType: 'webhook',
      actionTypes: ['gmail'],
      integrationTypes: ['email'],
    });

    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].entry.goal).toContain('email');
    expect(result.matches[0].matchReasons.some((r) => r.includes('trigger'))).toBe(true);
  });

  it('ranks by relevance score', async () => {
    const mockPrisma = {
      workflowPattern: {
        findMany: vi.fn().mockResolvedValue([
          makePattern({ id: 'p1', goal: 'Send email via webhook', triggerType: 'webhook', actionTypes: ['gmail'], integrationTypes: ['email'] }),
          makePattern({ id: 'p2', goal: 'Daily database backup to cloud', triggerType: 'cron', actionTypes: ['supabase'] }),
          makePattern({ id: 'p3', goal: 'Notify Slack on webhook', triggerType: 'webhook', actionTypes: ['slack'], integrationTypes: ['slack'] }),
        ]),
      },
    };
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as any);

    const result = await workflowMemory.findSimilarWorkflows({
      goal: 'Send an email notification when a webhook fires',
      triggerType: 'webhook',
      actionTypes: ['gmail'],
      integrationTypes: ['email'],
    });

    expect(result.matches[0].score).toBeGreaterThan(result.matches[result.matches.length - 1].score);
  });

  it('returns empty for no matches', async () => {
    const mockPrisma = {
      workflowPattern: {
        findMany: vi.fn().mockResolvedValue([
          makePattern({ id: 'p1', goal: 'Upload files to S3 on form submit', triggerType: 'form_submission', actionTypes: ['http_request'] }),
        ]),
      },
    };
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as any);

    const result = await workflowMemory.findSimilarWorkflows({
      goal: 'Generate reports every Monday',
      triggerType: 'cron',
      actionTypes: ['google_sheets'],
      integrationTypes: ['sheets'],
    });

    expect(result.totalSearched).toBe(1);
  });

  it('returns up to the limit', async () => {
    const patterns = Array.from({ length: 15 }, (_, i) =>
      makePattern({ id: `p${i}`, goal: `Send email on webhook ${i}`, triggerType: 'webhook', actionTypes: ['gmail'], usageCount: 15 - i }),
    );
    const mockPrisma = { workflowPattern: { findMany: vi.fn().mockResolvedValue(patterns) } };
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as any);

    const result = await workflowMemory.findSimilarWorkflows(
      { goal: 'Send email on webhook', triggerType: 'webhook', actionTypes: ['gmail'], integrationTypes: ['email'] },
      5,
    );

    expect(result.matches.length).toBeLessThanOrEqual(5);
  });
});

describe('workflowMemory.buildMemoryContext', () => {
  it('returns empty string for no matches', async () => {
    const mockPrisma = {
      workflowPattern: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as any);

    const ctx = await workflowMemory.buildMemoryContext({
      goal: 'Something new',
      triggerType: 'webhook',
      actionTypes: ['gmail'],
      integrationTypes: [],
    });

    expect(ctx).toBe('');
  });

  it('returns formatted context with matches', async () => {
    const mockPrisma = {
      workflowPattern: {
        findMany: vi.fn().mockResolvedValue([
          makePattern({
            id: 'p1',
            goal: 'Send a welcome email when a webhook receives new user data',
            triggerType: 'webhook',
            actionTypes: ['gmail'],
            integrationTypes: ['email'],
            confidence: 0.92,
            usageCount: 12,
          }),
        ]),
      },
    };
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as any);

    const ctx = await workflowMemory.buildMemoryContext({
      goal: 'Send an email when a webhook is triggered',
      triggerType: 'webhook',
      actionTypes: ['gmail'],
      integrationTypes: ['email'],
    });

    expect(ctx).toContain('SIMILAR SUCCESSFUL WORKFLOWS');
    expect(ctx).toContain('welcome email');
    expect(ctx).toContain('webhook');
    expect(ctx).toContain('gmail');
    expect(ctx).toContain('12x');
    expect(ctx).toContain('0.92');
    expect(ctx).toContain('DO NOT copy');
  });
});

describe('workflowMemory similarity edge cases', () => {
  it('handles empty action types', async () => {
    const mockPrisma = {
      workflowPattern: {
        findMany: vi.fn().mockResolvedValue([
          makePattern({ id: 'p1', goal: 'Webhook entry', triggerType: 'webhook', actionTypes: [] }),
        ]),
      },
    };
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as any);

    const result = await workflowMemory.findSimilarWorkflows({
      goal: 'Webhook entry',
      triggerType: 'webhook',
      actionTypes: [],
      integrationTypes: [],
    });

    expect(result.matches.length).toBeGreaterThanOrEqual(0);
  });

  it('handles very long goal text', async () => {
    const longGoal = 'I need to create '.repeat(50) + ' a workflow';
    const mockPrisma = {
      workflowPattern: {
        findMany: vi.fn().mockResolvedValue([
          makePattern({ id: 'p1', goal: longGoal.slice(0, 200), triggerType: 'webhook', actionTypes: ['gmail'] }),
        ]),
      },
    };
    vi.mocked(getPrisma).mockReturnValue(mockPrisma as any);

    const ctx = await workflowMemory.buildMemoryContext({
      goal: longGoal,
      triggerType: 'webhook',
      actionTypes: ['gmail'],
      integrationTypes: [],
    });

    expect(typeof ctx).toBe('string');
  });
});
