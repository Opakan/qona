import { Router } from 'express';
import { planWorkflow, type PlannerRequirement } from '../services/workflow-planner.js';
import { buildInternalGraph } from '../services/internal-graph-builder.js';
import { getPrisma } from '../lib/prisma.js';
import type { WorkflowPlanRequirement, WorkflowPlan } from '@qona/shared';
import type { Prisma } from '@prisma/client';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════
// In-memory planner sessions
// ═══════════════════════════════════════════════════════════

interface PlannerSession {
  goal: string;
  missingRequirements: PlannerRequirement[];
  answeredFields: string[];
  createdAt: number;
}

const sessions = new Map<string, PlannerSession>();

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

function createSessionId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

setInterval(cleanupExpiredSessions, 5 * 60 * 1000); // run cleanup every 5 min

export const plannerRouter = Router();

// ═══════════════════════════════════════════════════════════
// POST /api/planner/start
// Input: { "prompt": "..." }
// Output: { sessionId, goal, question } or { readyForGraph: true }
// ═══════════════════════════════════════════════════════════

plannerRouter.post('/planner/start', async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'prompt is required and must be a non-empty string' });
      return;
    }

    const result = await planWorkflow(prompt.trim());

    if (result.readyForGraph || result.missingRequirements.length === 0) {
      res.json({ readyForGraph: true, goal: result.goal });
      return;
    }

    const sessionId = createSessionId();

    sessions.set(sessionId, {
      goal: result.goal,
      missingRequirements: result.missingRequirements,
      answeredFields: [],
      createdAt: Date.now(),
    });

    res.json({
      sessionId,
      goal: result.goal,
      question: result.missingRequirements[0].question,
      field: result.missingRequirements[0].field,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/planner/answer
// Input: { "sessionId": "...", "field": "...", "answer": "..." }
// Output: { question, field } or { readyForGraph: true, goal: ..., completedRequirements: [...] }
// ═══════════════════════════════════════════════════════════

plannerRouter.post('/planner/answer', async (req, res, next) => {
  try {
    const { sessionId, field, answer } = req.body as {
      sessionId?: string;
      field?: string;
      answer?: string;
    };

    if (!sessionId || !field || !answer) {
      res.status(400).json({ error: 'sessionId, field, and answer are required' });
      return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found or expired' });
      return;
    }

    // Remove the answered requirement
    const beforeLength = session.missingRequirements.length;
    session.missingRequirements = session.missingRequirements.filter(
      (r) => r.field !== field,
    );

    if (session.missingRequirements.length === beforeLength) {
      // The field wasn't found in missing requirements — still continue
      session.answeredFields.push(field);
    } else {
      session.answeredFields.push(field);
    }

    // Check if all requirements are answered
    if (session.missingRequirements.length === 0) {
      sessions.delete(sessionId);
      res.json({
        readyForGraph: true,
        goal: session.goal,
        completedRequirements: session.answeredFields,
      });
      return;
    }

    // Ask the next question
    const next = session.missingRequirements[0];
    res.json({
      question: next.question,
      field: next.field,
      remaining: session.missingRequirements.length,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/planner/build
// Input: flat collected answers { trigger, action, provider, recipient, ... }
// Output: { nodes, edges } simplified graph
// ═══════════════════════════════════════════════════════════

const TRIGGER_LIKE_KEYS = new Set(['trigger', 'trigger_type', 'triggerType']);

const ACTION_LIKE_KEYS = new Set(['action', 'action_type', 'actionType']);

function mapAnswersToPlan(answers: Record<string, string>): WorkflowPlan {
  const entries = Object.entries(answers);
  const triggerType = entries.find(([k]) => TRIGGER_LIKE_KEYS.has(k))?.[1] ?? 'webhook';
  const actionType = entries.find(([k]) => ACTION_LIKE_KEYS.has(k))?.[1] ?? 'http_request';

  // remaining keys become trigger or action config
  const configKeys = entries.filter(
    ([k]) => !TRIGGER_LIKE_KEYS.has(k) && !ACTION_LIKE_KEYS.has(k),
  );

  const requirements: WorkflowPlanRequirement[] = [
    {
      field: 'trigger_type',
      label: 'Trigger type',
      kind: 'trigger_config',
      required: true,
      collected: true,
      value: triggerType,
    },
    {
      field: 'action_0_type',
      label: 'Action type',
      kind: 'action_config',
      required: true,
      collected: true,
      value: actionType,
    },
    ...configKeys.map(([key, value]) => {
      const isPurpose = key === 'purpose' || key === 'goal';
      return {
        field: key.startsWith('action_') ? key : `action_0_${key}`,
        label: key,
        kind: (isPurpose ? 'general' : 'action_config') as WorkflowPlanRequirement['kind'],
        required: false,
        collected: true,
        value,
      };
    }),
    {
      field: 'workflow_name',
      label: 'Workflow name',
      kind: 'general',
      required: false,
      collected: true,
      value: `${triggerType} → ${actionType}`,
    },
  ];

  return {
    goal: `${triggerType} → ${actionType}`,
    stage: 'planning',
    trigger: {
      type: triggerType,
      label: triggerType,
      description: '',
      config: Object.fromEntries(
        entries.filter(([k]) => !TRIGGER_LIKE_KEYS.has(k) && !ACTION_LIKE_KEYS.has(k)),
      ),
    },
    actions: [
      {
        type: actionType,
        label: actionType,
        description: '',
        order: 1,
        config: Object.fromEntries(
          entries.filter(([k]) => !TRIGGER_LIKE_KEYS.has(k) && !ACTION_LIKE_KEYS.has(k)),
        ),
      },
    ],
    integrations: [],
    questions: [],
    requirements,
    confidence: 1.0,
  };
}

plannerRouter.post('/planner/build', async (req, res, next) => {
  try {
    const answers = req.body as Record<string, string>;

    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
      res.status(400).json({ error: 'body must be a non-empty object of field:value pairs' });
      return;
    }

    const plan = mapAnswersToPlan(answers);

    const { graph } = buildInternalGraph(plan);

    res.json({
      nodes: graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        config: n.config,
      })),
      edges: graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/planner/save
// Input: { "userId": "...", "goal": "...", "answers": {...} }
// Saves the graph generated from answers to WorkflowDraft
// Output: { "draftId": "...", "goal": "..." }
// ═══════════════════════════════════════════════════════════

plannerRouter.post('/planner/save', async (req, res, next) => {
  try {
    const { userId, goal, answers } = req.body as {
      userId?: string;
      goal?: string;
      answers?: Record<string, string>;
    };

    if (!userId || !answers || !goal) {
      res.status(400).json({ error: 'userId, goal, and answers are required' });
      return;
    }

    const plan = mapAnswersToPlan({ ...answers });

    const { graph } = buildInternalGraph(plan);

    const prisma = getPrisma();

    const draft = await prisma.workflowDraft.create({
      data: {
        userId,
        goal,
        requirements: answers as Prisma.InputJsonValue,
        internalGraph: graph as unknown as Prisma.InputJsonValue,
      },
    });

    res.json({
      draftId: draft.id,
      goal: draft.goal,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      createdAt: draft.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
