import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { conversationService } from '../services/conversation.service.js';
import { conversationEngine } from '../services/conversation-engine.js';
import { getPrisma } from '../lib/prisma.js';

export const conversationsRouter = Router();

const CreateConversationSchema = z.object({
  title: z.string().min(1).max(200),
  workflowId: z.string().optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

conversationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const conversations = await conversationService.list(req.user!.authId);
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

conversationsRouter.post(
  '/',
  requireAuth,
  validate(CreateConversationSchema),
  async (req, res, next) => {
    try {
      const conversation = await conversationService.create({
        userId: req.user!.authId,
        title: req.body.title,
        workflowId: req.body.workflowId,
      });
      res.status(201).json({ conversation });
    } catch (err) {
      next(err);
    }
  },
);

conversationsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const conversation = await conversationService.getFullHistory(id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
});

conversationsRouter.post(
  '/:id/messages',
  requireAuth,
  validate(SendMessageSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const result = await conversationEngine.processMessage(
        id,
        req.user!.authId,
        req.body.content,
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

conversationsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const prisma = getPrisma();
    await prisma.conversation.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
