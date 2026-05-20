import type { Prisma } from '@prisma/client';
import { BaseRepository } from './base.js';

export class ConversationRepository extends BaseRepository {
  async findById(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findByUserId(userId: string, options?: { status?: string }) {
    return this.prisma.conversation.findMany({
      where: { userId, ...(options?.status ? { status: options.status } : {}) },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async findByWorkflowId(workflowId: string) {
    return this.prisma.conversation.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: { userId: string; title: string; workflowId?: string }) {
    return this.prisma.conversation.create({
      data: {
        userId: data.userId,
        title: data.title,
        workflowId: data.workflowId,
      },
    });
  }

  async archive(id: string) {
    return this.prisma.conversation.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async addMessage(
    conversationId: string,
    data: { role: string; content: string; metadata?: Record<string, unknown> },
  ) {
    return this.prisma.conversationMessage.create({
      data: {
        conversationId,
        role: data.role,
        content: data.content,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async getMessages(conversationId: string) {
    return this.prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
