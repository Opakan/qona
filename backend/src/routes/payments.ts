import { Router } from 'express';
import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
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
    const prisma = getPrisma();

    // Resolve user by authId OR email (handles stale/fake authIds from manual admin operations)
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { authId: req.user!.authId },
          { email: req.user!.email },
        ],
      },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: { authId: req.user!.authId, email: req.user!.email, name: req.user!.name || 'User' },
      });
    } else if (dbUser.authId !== req.user!.authId) {
      // Bind the real Supabase authId to this user record
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { authId: req.user!.authId },
      });
      console.log(`[Payments] Bound real authId ${req.user!.authId} to user ${dbUser.email}`);
    }

    const planSlug = req.body.plan as 'starter' | 'pro' | 'enterprise';
    const interval = (req.body.billingInterval as 'month' | 'year') || 'month';
    const pricing = PLAN_PRICING[planSlug] || { month: 1, year: 10 };
    const amount = interval === 'year' ? pricing.year : pricing.month;

    const result = await paymentService.initFlutterwave({
      email: dbUser.email,
      amount,
      planSlug,
      userId: dbUser.id,
      billingInterval: interval,
      metadata: { name: dbUser.name, interval },
    });

    res.json(result);
  } catch (err) {
    console.error('[Payments Initialize Error]:', err);
    next(err);
  }
});

paymentsRouter.get('/verify', optionalAuth, async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const txRef = (req.query.reference || req.query.tx_ref || req.query.txRef) as string | undefined;
    const transactionId = (req.query.transaction_id || req.query.transactionId || req.query.id) as string | undefined;

    // 1. If transactionId OR txRef is present, verify directly with Flutterwave live
    const identifier = transactionId || txRef;
    if (identifier) {
      const subscription = await paymentService.verifyAndActivatePayment(identifier, txRef, req.user);
      return res.json({ subscription });
    }

    // 2. Fallback: check database for existing active subscription by providerRef
    if (txRef) {
      const subscription = await prisma.subscription.findUnique({
        where: { providerRef: txRef },
        include: { plan: true },
      });
      if (subscription) {
        return res.json({ subscription });
      }
    }

    throw new AppError('Unable to verify transaction. Please provide transaction ID or reference.', 400);
  } catch (err) { next(err); }
});

paymentsRouter.get('/subscription', requireAuth, async (req, res, next) => {
  try {
    const prisma = getPrisma();
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { authId: req.user!.authId },
          { email: req.user!.email },
        ],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { authId: req.user!.authId, email: req.user!.email, name: req.user!.name || 'User' },
      });
    } else if (user.authId !== req.user!.authId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { authId: req.user!.authId },
      });
    }

    let subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { plan: true, invoices: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });

    // Check if subscription is actively valid
    const now = new Date();
    const expiresAtDate = subscription?.expiresAt ? new Date(subscription.expiresAt) : null;
    const isUnexpired = Boolean(expiresAtDate && expiresAtDate > now);
    let isCurrentlyActive = subscription && (
      subscription.status === 'ACTIVE' || 
      (subscription.status === 'CANCELLED' && isUnexpired)
    );

    // If user has no active subscription in DB, auto-reconcile with Flutterwave
    if (!isCurrentlyActive && user.email) {
      const reconciled = await paymentService.reconcileUserPayment(user);
      if (reconciled) {
        subscription = await prisma.subscription.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          include: { plan: true, invoices: { orderBy: { createdAt: 'desc' }, take: 10 } },
        });
      }
    }

    if (subscription) {
      const subExpiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;
      const subUnexpired = Boolean(subExpiresAt && subExpiresAt > now);
      const isAccessActive = subscription.status === 'ACTIVE' || (subscription.status === 'CANCELLED' && subUnexpired);
      const remainingMs = subExpiresAt && subUnexpired ? subExpiresAt.getTime() - now.getTime() : 0;
      const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

      return res.json({
        subscription: {
          ...subscription,
          isAccessActive,
          remainingDays,
        },
      });
    }

    res.json({ subscription: null });
  } catch (err) { next(err); }
});

paymentsRouter.post('/cancel', requireAuth, async (req, res, next) => {
  try {
    const prisma = getPrisma();
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { authId: req.user!.authId },
          { email: req.user!.email },
        ],
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    } else if (user.authId !== req.user!.authId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { authId: req.user!.authId },
      });
    }

    const { reason } = req.body || {};
    const subscription = await paymentService.cancelSubscription(user.id, reason);

    const now = new Date();
    const expiresAtDate = subscription.expiresAt ? new Date(subscription.expiresAt) : new Date();
    const remainingMs = Math.max(0, expiresAtDate.getTime() - now.getTime());
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
    const formattedDate = expiresAtDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    res.json({
      success: true,
      message: `Your subscription has been cancelled. Auto-renewal is stopped, but you retain full access to your Pro features for the remaining ${remainingDays} day(s) (until ${formattedDate}).`,
      subscription: {
        ...subscription,
        isAccessActive: remainingDays > 0,
        remainingDays,
      },
      remainingDays,
      expiresAt: subscription.expiresAt,
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
