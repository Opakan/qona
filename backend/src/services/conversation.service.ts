import { db } from './db.js';
import { getPrisma } from '../lib/prisma.js';

export const conversationService = {
  async list(userId: string, options?: { status?: string }) {
    return db.conversation.findByUserId(userId, options);
  },

  async getById(id: string) {
    return db.conversation.findById(id);
  },

  async create(params: { userId: string; title: string; workflowId?: string }) {
    return db.conversation.create(params);
  },

  async archive(id: string) {
    return db.conversation.archive(id);
  },

  async addMessage(
    conversationId: string,
    params: { role: string; content: string; metadata?: Record<string, unknown> },
  ) {
    const message = await db.conversation.addMessage(conversationId, params);
    const prisma = getPrisma();
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return message;
  },

  async getMessages(conversationId: string) {
    return db.conversation.getMessages(conversationId);
  },

  async getFullHistory(conversationId: string) {
    return db.conversation.findById(conversationId);
  },
};
