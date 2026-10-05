import { getPrisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';

export interface UserExportQuota {
  cap: number;
  used: number;
  remaining: number;
  periodStart: Date;
  periodEnd: Date | null;
  planSlug: string;
  planName: string;
  isActive: boolean;
  canExport: boolean;
}

export async function getUserExportQuota(userIdentifier: string): Promise<UserExportQuota> {
  const prisma = getPrisma();
  const now = new Date();

  // Resolve user record by id, authId, or email
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: userIdentifier },
        { authId: userIdentifier },
        { email: userIdentifier },
      ],
    },
  });

  const userId = user ? user.id : userIdentifier;

  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  const expiresAtDate = subscription?.expiresAt ? new Date(subscription.expiresAt) : null;
  const isUnexpired = Boolean(expiresAtDate && expiresAtDate > now);
  const isActive = Boolean(
    subscription && (
      subscription.status === 'ACTIVE' ||
      (subscription.status === 'CANCELLED' && isUnexpired)
    )
  );

  const planSlug = (subscription?.plan?.slug?.toLowerCase() || 'free') as 'starter' | 'pro' | 'enterprise' | 'free';
  const planName = subscription?.plan?.name || (isActive ? 'Starter Plan' : 'Free Sandbox');

  // Determine monthly cap based on plan tier
  let cap = 0;
  if (isActive) {
    if (planSlug === 'starter') {
      cap = 10;
    } else if (planSlug === 'pro') {
      cap = 100;
    } else if (planSlug === 'enterprise') {
      cap = 1000;
    } else {
      cap = subscription?.plan?.exports ?? 10;
    }
  }

  // Calculate current monthly billing period (Strictly NO rollover between periods)
  let periodStart: Date;
  let periodEnd: Date | null = expiresAtDate;

  if (subscription?.currentPeriod) {
    periodStart = new Date(subscription.currentPeriod);
  } else if (subscription?.createdAt) {
    periodStart = new Date(subscription.createdAt);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // If periodEnd is in the future, determine start of current monthly cycle
  if (periodEnd && periodEnd > now) {
    const approxCycleStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (approxCycleStart > periodStart) {
      periodStart = approxCycleStart;
    }
  }

  // Count exports exclusively within the current paid billing cycle (zero rollover)
  const used = await prisma.exportHistory.count({
    where: {
      userId,
      exportedAt: {
        gte: periodStart,
        ...(periodEnd ? { lte: periodEnd } : {}),
      },
    },
  });

  const remaining = Math.max(0, cap - used);
  const canExport = isActive && remaining > 0;

  return {
    cap,
    used,
    remaining,
    periodStart,
    periodEnd,
    planSlug,
    planName,
    isActive,
    canExport,
  };
}

export async function recordExportHistory(params: {
  userId: string;
  workflowId: string;
  platform?: string;
  format?: string;
  metadata?: Record<string, unknown>;
}) {
  const prisma = getPrisma();

  // Resolve user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: params.userId },
        { authId: params.userId },
        { email: params.userId },
      ],
    },
  });

  const resolvedUserId = user ? user.id : params.userId;

  // Ensure workflow exists in DB to prevent foreign key constraint violations
  let finalWorkflowId = params.workflowId;
  const existingWf = await prisma.workflow.findUnique({
    where: { id: params.workflowId },
  });

  if (!existingWf) {
    // Check if user has any existing workflow, otherwise create a minimal placeholder
    const userWf = await prisma.workflow.findFirst({
      where: { userId: resolvedUserId },
    });
    if (userWf) {
      finalWorkflowId = userWf.id;
    } else {
      const created = await prisma.workflow.create({
        data: {
          id: params.workflowId,
          userId: resolvedUserId,
          name: (params.metadata?.workflowName as string) || 'Exported Automation',
          definition: {},
        },
      }).catch(async () => {
        return prisma.workflow.findFirst({ where: { userId: resolvedUserId } });
      });
      if (created) finalWorkflowId = created.id;
    }
  }

  return prisma.exportHistory.create({
    data: {
      userId: resolvedUserId,
      workflowId: finalWorkflowId,
      platform: params.platform || 'n8n',
      format: params.format || 'json',
      status: 'SUCCESS',
      metadata: (params.metadata || {}) as Prisma.InputJsonValue,
    },
  });
}
