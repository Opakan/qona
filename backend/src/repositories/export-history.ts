import type { Prisma } from '@prisma/client';
import { BaseRepository } from './base.js';

export class ExportHistoryRepository extends BaseRepository {
  async findById(id: string) {
    return this.prisma.exportHistory.findUnique({ where: { id } });
  }

  async findByUserId(userId: string, options?: { skip?: number; take?: number }) {
    return this.prisma.exportHistory.findMany({
      where: { userId },
      orderBy: { exportedAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  async findByWorkflowId(workflowId: string) {
    return this.prisma.exportHistory.findMany({
      where: { workflowId },
      orderBy: { exportedAt: 'desc' },
    });
  }

  async create(data: {
    userId: string;
    workflowId: string;
    platform: string;
    format?: string;
    status?: string;
    fileUrl?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.exportHistory.create({
      data: {
        userId: data.userId,
        workflowId: data.workflowId,
        platform: data.platform,
        format: data.format ?? 'json',
        status: data.status ?? 'SUCCESS',
        fileUrl: data.fileUrl,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.exportHistory.count({ where: { userId } });
  }
}
