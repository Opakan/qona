import { Router } from 'express';
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { paymentService } from '../services/payment.js';
import { config } from '../config.js';
import { getPrisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const paymentsRouter = Router();

const PLAN_PRICING: Record<string, { month: number; year: number }> = {
  starter: { month: 1, year: 10 },
  pro: { month: 30, year: 288 }, // 20% discount ($24/mo billed annually)
  enterprise: { month: 99, year: 948 }, // 20% discount ($79/mo billed annually)
};

const InitPaymentSchema = z.object({
  plan: z.enum(['starter', 'pro', 'enterprise']),
  billingInterval: z.enum(['month', 'year']).optional().default('month'),
});

paymentsRouter.get('/plans', async (_req, res, next) => {
  try {
    const prisma = getPrisma();
    let plans = await prisma.subscriptionPlan.findMany({ where: { active: true }, orderBy: { price: 'asc' } });
    if (plans.length === 0) {
      plans = [
        {
          id: 'starter',
          name: 'Starter',
          slug: 'starter',
          description: 'Start building workflows with essential tools.',
          price: 1,
          currency: 'USD',
          interval: 'month',
          exports: 10,
          features: ['10 workflow exports', 'Standard AI generation', 'n8n format export', 'Community support'],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        {
          id: 'pro',
          name: 'Pro',
          slug: 'pro',
          description: 'For professionals and growing teams.',
          price: 30,
          currency: 'USD',
          interval: 'month',
          exports: 100,
          features: ['100 workflow exports', 'Advanced Claude 3.5 AI', 'All platform exports', 'Version history', 'Priority email support'],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        {
          id: 'enterprise',
          name: 'Enterprise',
          slug: 'enterprise',
          description: 'For growing businesses, agencies, and teams.',
          price: 99,
          currency: 'USD',
          interval: 'month',
          exports: 1000,
          features: ['Unlimited workflow exports', 'Custom AI fine-tuning', 'All platform exports', 'Unlimited versions', 'API access & webhooks', 'Dedicated 24/7 support'],
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ];
    }
    res.json({ plans });
  } catch (err) { next(err); }
});

paymentsRouter.get('/keys', (_req, res) => {
  res.json({ flutterwavePublicKey: config.FLUTTERWAVE_PUBLIC_KEY });
});

paymentsRouter.post('/initialize', requireAuth, validate(InitPaymentSchema), async (req, res, next) => {
  try {
    let userId = req.user!.authId;
    let userEmail = req.user!.email;
    let userName = req.user!.name;

    try {
      const prisma = getPrisma();
      let user = await prisma.user.findUnique({ where: { authId: req.user!.authId } });
      if (!user) {
        user = await prisma.user.upsert({
          where: { authId: req.user!.authId },
          update: { email: req.user!.email, name: req.user!.name },
          create: { authId: req.user!.authId, email: req.user!.email, name: req.user!.name },
        });
      }
      if (user) {
        userId = user.id;
        userEmail = user.email;
        userName = user.name;
      }
    } catch (dbErr) {
      console.warn('[Payments] DB user lookup warning (proceeding with session info):', (dbErr as Error).message);
    }

    const planSlug = req.body.plan as 'starter' | 'pro' | 'enterprise';
    const interval = (req.body.billingInterval as 'month' | 'year') || 'month';
    const pricing = PLAN_PRICING[planSlug] || { month: 1, year: 10 };
    const amount = interval === 'year' ? pricing.year : pricing.month;

    const result = await paymentService.initFlutterwave({
      email: userEmail,
      amount,
      planSlug,
      userId,
      billingInterval: interval,
      metadata: { name: userName, interval },
    });

    res.json(result);
  } catch (err) {
    console.error('[Payments Initialize Error]:', err);
    next(err);
  }
});

paymentsRouter.get('/verify', requireAuth, async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const txRef = (req.query.reference || req.query.tx_ref) as string | undefined;
    const transactionId = (req.query.transaction_id || req.query.transactionId) as string | undefined;

    // If transaction_id is present, perform instant live verification with Flutterwave
    if (transactionId) {
      const subscription = await paymentService.verifyAndActivatePayment(transactionId, txRef);
      return res.json({ subscription });
    }

    // Fallback: check database for existing active subscription
    if (txRef) {
      const subscription = await prisma.subscription.findUnique({
        where: { providerRef: txRef },
        include: { plan: true },
      });
      if (subscription) {
        return res.json({ subscription });
      }
    }

    throw new AppError('Unable to verify transaction. Please provide transaction ID or contact support.', 400);
  } catch (err) { next(err); }
});

paymentsRouter.get('/subscription', requireAuth, async (req, res, next) => {
  try {
    const prisma = getPrisma();
    let user = await prisma.user.findUnique({ where: { authId: req.user!.authId } });
    if (!user) {
      user = await prisma.user.upsert({
        where: { authId: req.user!.authId },
        update: { email: req.user!.email, name: req.user!.name },
        create: { authId: req.user!.authId, email: req.user!.email, name: req.user!.name },
      });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { plan: true, invoices: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    res.json({ subscription });
  } catch (err) { next(err); }
});

paymentsRouter.post('/cancel', requireAuth, async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { authId: req.user!.authId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const { reason } = req.body || {};
    const subscription = await paymentService.cancelSubscription(user.id, reason);

    res.json({
      success: true,
      message: 'Your subscription has been successfully cancelled.',
      subscription,
    });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post('/webhook/flutterwave', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const secretHash = req.headers['verif-hash'] as string;
    const expectedSecret = config.FLUTTERWAVE_SECRET_HASH || config.FLUTTERWAVE_SECRET_KEY;
    if (expectedSecret && secretHash !== expectedSecret && secretHash !== config.FLUTTERWAVE_SECRET_KEY) {
      throw new AppError('Invalid signature', 401);
    }
    const payload = JSON.parse(req.body.toString() || '{}');
    await paymentService.handleFlutterwaveWebhook(payload);
    res.json({ success: true });
  } catch (err) { next(err); }
});
