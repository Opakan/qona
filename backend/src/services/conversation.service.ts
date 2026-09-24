import { db } from './db.js';
import { getPrisma } from '../lib/prisma.js';
import { resolveUserId } from './user-sync.js';

export const conversationService = {
  async list(authId: string, options?: { status?: string }) {
    const userId = await resolveUserId(authId);
    return db.conversation.findByUserId(userId, options);
  },
  async getById(id: string) { return db.conversation.findById(id); },
  async create(params: { authId: string; title: string; workflowId?: string; email?: string; name?: string }) {
    const userId = await resolveUserId(params.authId, params.email, params.name);
    return db.conversation.create({ userId, title: params.title, workflowId: params.workflowId });
  },
  async archive(id: string) { return db.conversation.archive(id); },
  async addMessage(conversationId: string, params: { role: string; content: string; metadata?: Record<string, unknown> }) {
    const msg = await db.conversation.addMessage(conversationId, params);
    const prisma = getPrisma();
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    return msg;
  },
  async getMessages(cid: string) { return db.conversation.getMessages(cid); },
  async getFullHistory(cid: string) { return db.conversation.findById(cid); },
};
