import type { PrismaClient, Prisma } from '@prisma/client';
import { BaseRepository } from './base.js';

export class WorkflowPatternRepository extends BaseRepository {
  async findById(id: string) {
    return this.prisma.workflowPattern.findUnique({ where: { id } });
  }

  async findByUserId(userId: string, options?: { skip?: number; take?: number }) {
    return this.prisma.workflowPattern.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take ?? 50,
    });
  }

  async findSuccessfulByUserId(userId: string) {
    return this.prisma.workflowPattern.findMany({
      where: { userId, success: true },
      orderBy: { usageCount: 'desc' },
      take: 100,
    });
  }

  async findByTriggerType(triggerType: string) {
    return this.prisma.workflowPattern.findMany({
      where: { triggerType, success: true },
      orderBy: { usageCount: 'desc' },
      take: 50,
    });
  }

  /** Return all successful patterns for similarity search */
  async getAllSuccessful() {
    return this.prisma.workflowPattern.findMany({
      where: { success: true },
      orderBy: { usageCount: 'desc' },
      take: 200,
    });
  }

  async create(data: {
    userId: string;
    goal: string;
    triggerType: string;
    triggerLabel?: string;
    actionTypes: string[];
    integrationTypes: string[];
    graphSnapshot: Record<string, unknown>;
    confidence: number;
    success?: boolean;
  }) {
    return this.prisma.workflowPattern.create({
      data: {
        userId: data.userId,
        goal: data.goal,
        triggerType: data.triggerType,
        triggerLabel: data.triggerLabel ?? '',
        actionTypes: data.actionTypes as Prisma.InputJsonValue,
        integrationTypes: data.integrationTypes as Prisma.InputJsonValue,
        graphSnapshot: data.graphSnapshot as Prisma.InputJsonValue,
        confidence: data.confidence,
        success: data.success ?? false,
      },
    });
  }

  async markSuccess(patternId: string) {
    return this.prisma.workflowPattern.update({
      where: { id: patternId },
      data: { success: true, usageCount: { increment: 1 } },
    });
  }

  async markFailed(patternId: string) {
    return this.prisma.workflowPattern.update({
      where: { id: patternId },
      data: { usageCount: { increment: 1 } },
    });
  }

  async incrementUsage(patternId: string) {
    return this.prisma.workflowPattern.update({
      where: { id: patternId },
      data: { usageCount: { increment: 1 } },
    });
  }
}

export class WorkflowExecutionLogRepository extends BaseRepository {
  async create(data: {
    userId: string;
    patternId?: string;
    status: string;
    errorMessage?: string;
    durationMs?: number;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.workflowExecutionLog.create({
      data: {
        userId: data.userId,
        patternId: data.patternId,
        status: data.status,
        errorMessage: data.errorMessage,
        durationMs: data.durationMs,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async findByPatternId(patternId: string) {
    return this.prisma.workflowExecutionLog.findMany({
      where: { patternId },
      orderBy: { executedAt: 'desc' },
      take: 20,
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.workflowExecutionLog.findMany({
      where: { userId },
      orderBy: { executedAt: 'desc' },
      take: 50,
    });
  }

  async getCountByStatus(userId: string, status: string) {
    return this.prisma.workflowExecutionLog.count({
      where: { userId, status },
    });
  }
}

export class WorkflowSuccessPatternRepository extends BaseRepository {
  async findByTriggerType(triggerType: string) {
    return this.prisma.workflowSuccessPattern.findMany({
      where: { triggerType },
      orderBy: { successCount: 'desc' },
      take: 20,
    });
  }

  async findTopPatterns(limit = 20) {
    return this.prisma.workflowSuccessPattern.findMany({
      orderBy: { successCount: 'desc' },
      take: limit,
    });
  }

  async upsert(data: {
    triggerType: string;
    actionTypes: string[];
    integrationTypes: string[];
    confidence: number;
    patternId?: string;
  }) {
    const key = `${data.triggerType}|${data.actionTypes.sort().join(',')}|${data.integrationTypes.sort().join(',')}`;
    const existing = await this.prisma.workflowSuccessPattern.findMany({
      where: { triggerType: data.triggerType },
      take: 100,
    });

    const match = existing.find((p) => {
      const patActions = (p.actionTypes as string[]).sort().join(',');
      const patIntegrations = (p.integrationTypes as string[]).sort().join(',');
      return patActions === data.actionTypes.sort().join(',') && patIntegrations === data.integrationTypes.sort().join(',');
    });

    if (match) {
      return this.prisma.workflowSuccessPattern.update({
        where: { id: match.id },
        data: {
          successCount: { increment: 1 },
          avgConfidence: ((match.avgConfidence * match.successCount) + data.confidence) / (match.successCount + 1),
          lastUsedAt: new Date(),
        },
      });
    }

    return this.prisma.workflowSuccessPattern.create({
      data: {
        triggerType: data.triggerType,
        actionTypes: data.actionTypes as Prisma.InputJsonValue,
        integrationTypes: data.integrationTypes as Prisma.InputJsonValue,
        successCount: 1,
        avgConfidence: data.confidence,
        patternId: data.patternId,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.workflowSuccessPattern.delete({ where: { id } });
  }
}
