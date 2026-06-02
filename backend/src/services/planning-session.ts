import { getPrisma } from '../lib/prisma.js';
import { PLANNING_STATES, PlanningStateSchema } from '@qona/shared';

const LOG_PREFIX = '[Planning]';

async function resolveUserId(authId: string, email?: string, name?: string): Promise<string> {
  const p = getPrisma();
  let u = await p.user.findUnique({ where: { authId } });
  if (!u) { u = await p.user.create({ data: { authId, email: email ?? authId+'@unknown', name: name ?? email ?? authId.slice(0,8) } }); console.log(LOG_PREFIX, { authId, prismaUserId: u.id, action: 'created' }); }
  else { console.log(LOG_PREFIX, { authId, prismaUserId: u.id, action: 'resolved' }); }
  return u.id;
}

import type { Prisma } from '@prisma/client';
import type {
  PlanningState,
  PlanningCollectedAnswer,
  PlanningMissingField,
} from '@qona/shared';

// ═══════════════════════════════════════════════════════════
// State machine
// ═══════════════════════════════════════════════════════════

const VALID_TRANSITIONS: Record<PlanningState, PlanningState[]> = {
  collecting_intent:   ['clarifying', 'generating_graph', 'completed'],
  clarifying:          ['clarifying', 'generating_graph', 'collecting_intent'],
  generating_graph:    ['compiling', 'clarifying', 'collecting_intent'],
  compiling:           ['completed', 'generating_graph', 'clarifying'],
  completed:           ['collecting_intent'],
};

function isValidTransition(from: PlanningState, to: string): to is PlanningState {
  const parsed = PlanningStateSchema.safeParse(to);
  if (!parsed.success) return false;
  return VALID_TRANSITIONS[from].includes(parsed.data);
}

// ═══════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════

export const planningSessionService = {
  async create(authId: string, conversationId?: string, email?: string, name?: string) {
    const prisma = getPrisma();
    return prisma.workflowPlanningSession.create({
      data: {
        userId: await resolveUserId(authId, email, name),
        conversationId,
        state: PLANNING_STATES.COLLECTING_INTENT,
        collectedAnswers: [] as unknown as Prisma.InputJsonValue,
        missingFields: [] as unknown as Prisma.InputJsonValue,
        stage: 0,
      },
    });
  },

  async getById(sessionId: string) {
    const prisma = getPrisma();
    return prisma.workflowPlanningSession.findUnique({
      where: { id: sessionId },
      include: { graph: true },
    });
  },

  async getByUserId(authId: string, options?: { state?: string }) {
    const prisma = getPrisma();
    return prisma.workflowPlanningSession.findMany({
      where: { userId: await resolveUserId(authId), ...(options?.state ? { state: options.state } : {}) },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  },

  async getActiveForUser(authId: string) {
    const prisma = getPrisma();
    return prisma.workflowPlanningSession.findFirst({
      where: { userId: await resolveUserId(authId), state: { not: PLANNING_STATES.COMPLETED } },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async transition(sessionId: string, toState: string): Promise<void> {
    const prisma = getPrisma();
    const session = await prisma.workflowPlanningSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const fromState = session.state as PlanningState;
    if (!isValidTransition(fromState, toState)) {
      throw new Error(
        `Invalid state transition: ${fromState} → ${toState}. ` +
        `Allowed from ${fromState}: ${VALID_TRANSITIONS[fromState].join(', ')}`,
      );
    }

    const newStage = toState !== fromState ? session.stage + 1 : session.stage;

    await prisma.workflowPlanningSession.update({
      where: { id: sessionId },
      data: { state: toState, stage: newStage },
    });
  },

  async addAnswer(sessionId: string, answer: PlanningCollectedAnswer): Promise<void> {
    const prisma = getPrisma();
    const session = await prisma.workflowPlanningSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');

    const answers = (session.collectedAnswers as PlanningCollectedAnswer[]) ?? [];
    const existing = answers.findIndex((a) => a.questionId === answer.questionId);
    if (existing >= 0) {
      answers[existing] = { ...answer, answeredAt: new Date().toISOString() };
    } else {
      answers.push({ ...answer, answeredAt: new Date().toISOString() });
    }

    const missingFields = (session.missingFields as PlanningMissingField[]) ?? [];
    const updatedMissing = missingFields.map((f) =>
      f.field === answer.field ? { ...f, answered: true } : f,
    );

    await prisma.workflowPlanningSession.update({
      where: { id: sessionId },
      data: {
        collectedAnswers: answers as unknown as Prisma.InputJsonValue,
        missingFields: updatedMissing as unknown as Prisma.InputJsonValue,
      },
    });
  },

  async setMissingFields(sessionId: string, fields: PlanningMissingField[]): Promise<void> {
    const prisma = getPrisma();
    await prisma.workflowPlanningSession.update({
      where: { id: sessionId },
      data: { missingFields: fields as unknown as Prisma.InputJsonValue },
    });
  },

  async setExtractedIntent(sessionId: string, intent: unknown): Promise<void> {
    const prisma = getPrisma();
    await prisma.workflowPlanningSession.update({
      where: { id: sessionId },
      data: { extractedIntent: intent as Prisma.InputJsonValue | undefined },
    });
  },

  async setWorkflowDraft(sessionId: string, draft: unknown): Promise<void> {
    const prisma = getPrisma();
    await prisma.workflowPlanningSession.update({
      where: { id: sessionId },
      data: { workflowDraft: draft as Prisma.InputJsonValue | undefined },
    });
  },

  async linkGraph(sessionId: string, graphId: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.workflowPlanningSession.update({
      where: { id: sessionId },
      data: { internalGraphId: graphId },
    });
  },

  async complete(sessionId: string): Promise<void> {
    await this.transition(sessionId, PLANNING_STATES.COMPLETED);
  },

  async getState(sessionId: string): Promise<PlanningState> {
    const prisma = getPrisma();
    const session = await prisma.workflowPlanningSession.findUnique({
      where: { id: sessionId },
      select: { state: true },
    });
    if (!session) throw new Error('Session not found');
    return session.state as PlanningState;
  },
};
