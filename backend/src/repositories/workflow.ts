import type { PrismaClient, Prisma } from '@prisma/client';
import { BaseRepository } from './base.js';

export class WorkflowRepository extends BaseRepository {
  async findById(id: string) {
    return this.prisma.workflow.findUnique({
      where: { id },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
  }

  async findByUserId(userId: string, options?: { status?: string; skip?: number; take?: number }) {
    return this.prisma.workflow.findMany({
      where: { userId, ...(options?.status ? { status: options.status } : {}) },
      orderBy: { updatedAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  async countByUserId(userId: string) {
    return this.prisma.workflow.count({ where: { userId } });
  }

  async create(data: {
    userId: string;
    name: string;
    description?: string;
    definition: Record<string, unknown>;
    status?: string;
  }) {
    return this.prisma.workflow.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description ?? '',
        definition: data.definition as Prisma.InputJsonValue,
        status: data.status ?? 'DRAFT',
      },
    });
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    definition?: Record<string, unknown>;
    status?: string;
  }) {
    return this.prisma.workflow.update({
      where: { id },
      data: {
        ...data,
        definition: data.definition as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.workflow.delete({ where: { id } });
  }

  async archive(id: string) {
    return this.prisma.workflow.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async createVersion(workflowId: string, definition: Record<string, unknown>, changelog: string) {
    const latest = await this.prisma.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    return this.prisma.workflowVersion.create({
      data: {
        workflowId,
        version: nextVersion,
        definition: definition as Prisma.InputJsonValue,
        changelog,
      },
    });
  }

  async listVersions(workflowId: string) {
    return this.prisma.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { version: 'desc' },
    });
  }
}
