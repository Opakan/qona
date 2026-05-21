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
  provider: z.enum(['paystack', 'flutterwave']),
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
  res.json({
    paystackPublicKey: config.PAYSTACK_PUBLIC_KEY,
    flutterwavePublicKey: config.FLUTTERWAVE_PUBLIC_KEY,
  });
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

      const result = await paymentService[`init${req.body.provider === 'paystack' ? 'Paystack' : 'Flutterwave'}`]({
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
    const provider = req.query.provider as string;

    if (!txRef || !provider) throw new AppError('Missing reference or provider', 400);

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

paymentsRouter.post('/webhook/paystack', async (req, res, next) => {
  try {
    const hash = req.headers['x-paystack-signature'] as string;
    if (!hash) throw new AppError('Missing signature', 400);

    const crypto = await import('crypto');
    const expected = crypto.createHmac('sha512', config.PAYSTACK_SECRET_KEY).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== expected) throw new AppError('Invalid signature', 401);

    await paymentService.handlePaystackWebhook(req.body);
    res.json({ success: true });
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
