import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { paymentService } from '../services/payment.js';
import { config } from '../config.js';
import { getPrisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const paymentsRouter = Router();

const InitPaymentSchema = z.object({
  plan: z.enum(['starter', 'pro']),
});

paymentsRouter.get('/plans', async (_req, res, next) => {
  try {
    const prisma = getPrisma();
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { price: 'asc' },
    });
    res.json({ plans });
  } catch (err) { next(err); }
});

paymentsRouter.get('/keys', (_req, res) => {
  res.json({ flutterwavePublicKey: config.FLUTTERWAVE_PUBLIC_KEY });
});

paymentsRouter.post(
  '/initialize',
  requireAuth,
  validate(InitPaymentSchema),
  async (req, res, next) => {
    try {
      const prisma = getPrisma();
      const user = await prisma.user.findUnique({ where: { authId: req.user!.authId } });
      if (!user) throw new AppError('User not found', 404);

      const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: req.body.plan } });
      if (!plan) throw new AppError('Plan not found', 404);

      const result = await paymentService.initFlutterwave({
        email: user.email,
        amount: plan.price,
        planSlug: plan.slug,
        userId: user.id,
        metadata: { name: user.name },
      });

      res.json(result);
    } catch (err) { next(err); }
  },
);

paymentsRouter.get('/verify', requireAuth, async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const txRef = req.query.reference as string;
    if (!txRef) throw new AppError('Missing reference', 400);
    const subscription = await prisma.subscription.findUnique({ where: { providerRef: txRef } });
    if (!subscription) throw new AppError('Subscription not found', 404);
    res.json({ subscription });
  } catch (err) { next(err); }
});

paymentsRouter.get('/subscription', requireAuth, async (req, res, next) => {
  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { authId: req.user!.authId } });
    const subscription = await prisma.subscription.findFirst({
      where: { userId: user!.id, status: 'ACTIVE' },
      include: { plan: true, invoices: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    res.json({ subscription });
  } catch (err) { next(err); }
});

paymentsRouter.post('/webhook/flutterwave', async (req, res, next) => {
  try {
    const secretHash = req.headers['verif-hash'] as string;
    if (secretHash !== config.FLUTTERWAVE_SECRET_KEY) throw new AppError('Invalid signature', 401);
    await paymentService.handleFlutterwaveWebhook(req.body);
    res.json({ success: true });
  } catch (err) { next(err); }
});
