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
    const plans = await prisma.subscriptionPlan.findMany({ where: { active: true }, orderBy: { price: 'asc' } });
    res.json({ plans });
  } catch (err) { next(err); }
});

paymentsRouter.get('/keys', (_req, res) => {
  res.json({ flutterwavePublicKey: config.FLUTTERWAVE_PUBLIC_KEY });
});

paymentsRouter.post('/initialize', requireAuth, validate(InitPaymentSchema), async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { authId: req.user!.authId } });
    if (!user) throw new AppError('User not found', 404);

    const planSlug = req.body.plan as 'starter' | 'pro' | 'enterprise';
    const interval = (req.body.billingInterval as 'month' | 'year') || 'month';
    const pricing = PLAN_PRICING[planSlug] || { month: 30, year: 288 };
    const amount = interval === 'year' ? pricing.year : pricing.month;

    const result = await paymentService.initFlutterwave({
      email: user.email,
      amount,
      planSlug,
      userId: user.id,
      billingInterval: interval,
      metadata: { name: user.name, interval },
    });

    res.json(result);
  } catch (err) { next(err); }
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
    const user = await prisma.user.findUnique({ where: { authId: req.user!.authId } });
    if (!user) throw new AppError('User not found', 404);

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id, status: 'ACTIVE' },
      include: { plan: true, invoices: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    res.json({ subscription });
  } catch (err) { next(err); }
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
