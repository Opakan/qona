import { getPrisma } from '../lib/prisma.js';
import type { InternalGraph } from '@qona/shared';
import type { Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface WorkflowMemoryEntry {
  id: string;
  goal: string;
  triggerType: string;
  triggerLabel: string;
  actionTypes: string[];
  integrationTypes: string[];
  confidence: number;
  usageCount: number;
  createdAt: Date;
}

export interface SimilarWorkflow {
  entry: WorkflowMemoryEntry;
  score: number;
  matchReasons: string[];
}

export interface SimilaritySearchResult {
  matches: SimilarWorkflow[];
  totalSearched: number;
}

// ═══════════════════════════════════════════════════════════
// Trigram tokenizer
// ═══════════════════════════════════════════════════════════

function trigrams(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 3) return [cleaned];
  const grams: string[] = [];
  for (let i = 0; i <= cleaned.length - 3; i++) {
    grams.push(cleaned.slice(i, i + 3));
  }
  return grams;
}

function trigramSimilarity(a: string, b: string): number {
  const gramsA = new Set(trigrams(a));
  const gramsB = new Set(trigrams(b));
  if (gramsA.size === 0 || gramsB.size === 0) return 0;
  let intersection = 0;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) intersection++;
  }
  return (2 * intersection) / (gramsA.size + gramsB.size);
}

// ═══════════════════════════════════════════════════════════
// Keyword extraction
// ═══════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'shall', 'i', 'me', 'my',
  'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them', 'this',
  'that', 'when', 'where', 'what', 'which', 'how', 'not', 'no', 'then',
  'just', 'also', 'very', 'too', 'so', 'if', 'than',
]);

function extractKeywords(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function keywordSimilarity(keywordsA: string[], keywordsB: string[]): number {
  const setA = new Set(keywordsA);
  const setB = new Set(keywordsB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const kw of setA) {
    if (setB.has(kw)) intersection++;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

// ═══════════════════════════════════════════════════════════
// Similarity scoring
// ═══════════════════════════════════════════════════════════

const WEIGHTS = {
  triggerType: 0.35,
  actionTypes: 0.25,
  integrationTypes: 0.15,
  goalTrigram: 0.15,
  goalKeyword: 0.10,
};

function computeSimilarity(
  query: {
    goal: string;
    triggerType: string;
    actionTypes: string[];
    integrationTypes: string[];
  },
  entry: WorkflowMemoryEntry,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const queryKw = extractKeywords(query.goal);
  const entryKw = extractKeywords(entry.goal);

  // Trigger type match (highest weight)
  if (query.triggerType && entry.triggerType === query.triggerType) {
    score += WEIGHTS.triggerType;
    reasons.push(`same trigger: ${entry.triggerType}`);
  }

  // Action type overlap
  if (query.actionTypes.length > 0 && entry.actionTypes.length > 0) {
    const querySet = new Set(query.actionTypes);
    const entrySet = new Set(entry.actionTypes);
    let overlap = 0;
    for (const a of querySet) {
      if (entrySet.has(a)) overlap++;
    }
    const actionScore = overlap / Math.max(querySet.size, entrySet.size);
    if (actionScore > 0) {
      score += WEIGHTS.actionTypes * actionScore;
      reasons.push(`action overlap: ${Math.round(actionScore * 100)}%`);
    }
  }

  // Integration overlap
  if (query.integrationTypes.length > 0 && entry.integrationTypes.length > 0) {
    const querySet = new Set(query.integrationTypes);
    const entrySet = new Set(entry.integrationTypes);
    let overlap = 0;
    for (const i of querySet) {
      if (entrySet.has(i)) overlap++;
    }
    const intScore = overlap / Math.max(querySet.size, entrySet.size);
    if (intScore > 0) {
      score += WEIGHTS.integrationTypes * intScore;
      reasons.push('integration overlap');
    }
  }

  // Goal trigram similarity
  const trigramScore = trigramSimilarity(query.goal, entry.goal);
  if (trigramScore > 0) {
    score += WEIGHTS.goalTrigram * trigramScore;
    if (trigramScore > 0.3) reasons.push(`similar description: ${Math.round(trigramScore * 100)}%`);
  }

  // Keyword similarity
  const kwScore = keywordSimilarity(queryKw, entryKw);
  if (kwScore > 0) {
    score += WEIGHTS.goalKeyword * kwScore;
    if (kwScore > 0.5) reasons.push('shared keywords');
  }

  return { score, reasons };
}

// ═══════════════════════════════════════════════════════════
// Memory service
// ═══════════════════════════════════════════════════════════

export const workflowMemory = {
  // ── Store a new pattern ──
  async storePattern(params: {
    userId: string;
    goal: string;
    triggerType: string;
    triggerLabel?: string;
    actionTypes: string[];
    integrationTypes: string[];
    graph: InternalGraph;
    confidence: number;
    success: boolean;
  }) {
    const prisma = getPrisma();

    const pattern = await prisma.workflowPattern.create({
      data: {
        userId: params.userId,
        goal: params.goal,
        triggerType: params.triggerType,
        triggerLabel: params.triggerLabel ?? '',
        actionTypes: params.actionTypes as Parameters<typeof prisma.workflowPattern.create>[0]['data']['actionTypes'],
        integrationTypes: params.integrationTypes as Parameters<typeof prisma.workflowPattern.create>[0]['data']['actionTypes'],
        graphSnapshot: params.graph as Parameters<typeof prisma.workflowPattern.create>[0]['data']['graphSnapshot'],
        confidence: params.confidence,
        success: params.success,
      },
    });

    // Upsert into success patterns if successful
    if (params.success) {
      await prisma.workflowSuccessPattern.upsert({
        where: { id: params.triggerType + '_' + params.actionTypes.sort().join('_') || 'none' },
        create: {
          id: params.triggerType + '_' + params.actionTypes.sort().join('_') || 'none',
          patternId: pattern.id,
          triggerType: params.triggerType,
          actionTypes: params.actionTypes as Parameters<typeof prisma.workflowSuccessPattern.create>[0]['data']['actionTypes'],
          integrationTypes: params.integrationTypes as Parameters<typeof prisma.workflowSuccessPattern.create>[0]['data']['actionTypes'],
          successCount: 1,
          avgConfidence: params.confidence,
        },
        update: {
          successCount: { increment: 1 },
          avgConfidence: params.confidence, // weighted average handled by DB
          lastUsedAt: new Date(),
        },
      });
    }

    return pattern;
  },

  // ── Log execution ──
  async logExecution(params: {
    userId: string;
    patternId?: string;
    status: 'SUCCESS' | 'FAILURE' | 'PENDING';
    errorMessage?: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
  }) {
    const prisma = getPrisma();
    return prisma.workflowExecutionLog.create({
      data: {
        userId: params.userId,
        patternId: params.patternId,
        status: params.status,
        errorMessage: params.errorMessage,
        durationMs: params.durationMs,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  },

  // ── Similarity search ──
  async findSimilarWorkflows(
    query: {
      goal: string;
      triggerType: string;
      actionTypes: string[];
      integrationTypes: string[];
    },
    limit = 10,
  ): Promise<SimilaritySearchResult> {
    const prisma = getPrisma();

    const candidates = await prisma.workflowPattern.findMany({
      where: { success: true },
      orderBy: { usageCount: 'desc' },
      take: 200,
    });

    const scored: SimilarWorkflow[] = [];

    for (const c of candidates) {
      const entry: WorkflowMemoryEntry = {
        id: c.id,
        goal: c.goal,
        triggerType: c.triggerType,
        triggerLabel: c.triggerLabel,
        actionTypes: c.actionTypes as string[],
        integrationTypes: c.integrationTypes as string[],
        confidence: c.confidence,
        usageCount: c.usageCount,
        createdAt: c.createdAt,
      };

      const { score, reasons } = computeSimilarity(query, entry);
      if (score > 0.1) {
        scored.push({ entry, score, matchReasons: reasons });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    return {
      matches: scored.slice(0, limit),
      totalSearched: candidates.length,
    };
  },

  // ── Get top success patterns globally ──
  async getTopSuccessPatterns(limit = 10) {
    const prisma = getPrisma();
    return prisma.workflowSuccessPattern.findMany({
      orderBy: { successCount: 'desc' },
      take: limit,
    });
  },

  // ── Build context string for DeepSeek ──
  async buildMemoryContext(query: {
    goal: string;
    triggerType: string;
    actionTypes: string[];
    integrationTypes: string[];
  }): Promise<string> {
    const { matches } = await this.findSimilarWorkflows(query, 5);

    if (matches.length === 0) return '';

    const lines: string[] = [
      '',
      'SIMILAR SUCCESSFUL WORKFLOWS (for reference only — adapt to current user request):',
      '',
    ];

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      lines.push(`#${i + 1} (score: ${m.score.toFixed(2)})`);
      lines.push(`  Goal: "${m.entry.goal}"`);
      lines.push(`  Trigger: ${m.entry.triggerType} (${m.entry.triggerLabel})`);
      lines.push(`  Actions: ${m.entry.actionTypes.join(', ')}`);
      if (m.entry.integrationTypes.length > 0) {
        lines.push(`  Integrations: ${m.entry.integrationTypes.join(', ')}`);
      }
      lines.push(`  Usage: ${m.entry.usageCount}x | Confidence: ${m.entry.confidence.toFixed(2)}`);
      if (m.matchReasons.length > 0) {
        lines.push(`  Match: ${m.matchReasons.join(', ')}`);
      }
      lines.push('');
    }

    lines.push('Use these as reference for node type selection and configuration patterns.');
    lines.push('DO NOT copy exact configurations — adapt to the current user request.');
    lines.push('');

    return lines.join('\n');
  },
};
