import axios from 'axios';
import type { Prisma } from '@prisma/client';
import { config } from '../config.js';
import { getPrisma } from '../lib/prisma.js';

const FLUTTERWAVE_BASE = 'https://api.flutterwave.com/v3';

export type PaymentProvider = 'flutterwave';

export interface InitPaymentParams {
  email: string;
  amount: number;
  planSlug: string;
  userId: string;
  billingInterval?: 'month' | 'year';
  metadata?: Record<string, unknown>;
}

export interface PaymentResult {
  provider: PaymentProvider;
  authorizationUrl: string;
  reference: string;
}

function extractFlutterwaveMeta(rawMeta: any): { userId?: string; planSlug: string; interval: 'month' | 'year' } {
  let userId: string | undefined;
  let planSlug = 'starter';
  let interval: 'month' | 'year' = 'month';

  if (Array.isArray(rawMeta)) {
    for (const item of rawMeta) {
      const name = String(item.metaname || item.name || item.key || '').toLowerCase();
      const val = String(item.metavalue || item.value || '');
      if (name === 'userid') userId = val;
      if (name === 'plan' || name === 'planslug') planSlug = val;
      if (name === 'interval' || name === 'billinginterval') interval = val as any;
    }
  } else if (rawMeta && typeof rawMeta === 'object') {
    userId = rawMeta.userId || rawMeta.userid || rawMeta.user_id;
    planSlug = rawMeta.plan || rawMeta.planSlug || 'starter';
    interval = (rawMeta.interval || rawMeta.billingInterval || 'month') as any;
  }

  return { userId, planSlug, interval };
}

export const paymentService = {
  async initFlutterwave(params: InitPaymentParams): Promise<PaymentResult> {
    const ref = `QONA-FLW-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const interval = params.billingInterval ?? 'month';

    const { data } = await axios.post(
      `${FLUTTERWAVE_BASE}/payments`,
      {
        tx_ref: ref,
        amount: params.amount,
        currency: 'USD',
        redirect_url: `${config.APP_URL}/payment/success?provider=flutterwave&plan=${params.planSlug}`,
        // Offer card, bank transfer, and USSD — bank transfer/USSD skip OTP entirely
        payment_options: 'card,banktransfer,ussd,mobilemoney',
        customer: {
          email: params.email,
          name: (params.metadata?.name as string) ?? params.email,
        },
        meta: {
          userId: params.userId,
          plan: params.planSlug,
          interval,
        },
        customizations: {
          title: 'Qonace',
          description: `${params.planSlug.toUpperCase()} Plan (${interval === 'year' ? 'Annual - 20% Off' : 'Monthly'})`,
          logo: `${config.APP_URL}/logo.png`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (data.status !== 'success') throw new Error(`Flutterwave: ${data.message}`);

    return { provider: 'flutterwave', authorizationUrl: data.data.link, reference: ref };
  },

  async verifyFlutterwave(transactionId: string | number) {
    const { data } = await axios.get(
      `${FLUTTERWAVE_BASE}/transactions/${transactionId}/verify`,
      { headers: { Authorization: `Bearer ${config.FLUTTERWAVE_SECRET_KEY}` } },
    );
    return data;
  },

  async createSubscription(userId: string, planSlug: string, provider: PaymentProvider, providerRef: string, interval: 'month' | 'year' = 'month') {
    const prisma = getPrisma();
    let plan = await prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } });
    if (!plan) {
      const defaultPlans: Record<string, { name: string; price: number; description: string; exports: number }> = {
        starter: { name: 'Starter', price: 1, description: 'Start building workflows with essential tools.', exports: 10 },
        pro: { name: 'Pro', price: 30, description: 'For professionals and growing teams.', exports: 100 },
        enterprise: { name: 'Enterprise', price: 99, description: 'For growing businesses and agencies.', exports: 1000 },
      };
      const def = defaultPlans[planSlug] || { name: planSlug.toUpperCase(), price: 30, description: `${planSlug} plan`, exports: 100 };
      plan = await prisma.subscriptionPlan.create({
        data: {
          name: def.name,
          slug: planSlug,
          description: def.description,
          price: def.price,
          currency: 'USD',
          interval: interval,
          exports: def.exports,
          features: ['All workflow exports', 'Claude 3.5 AI workflow engine', 'n8n format export'],
          active: true,
        },
      });
    }

    // Check if subscription with this reference already exists (idempotency)
    const existingRef = await prisma.subscription.findUnique({
      where: { providerRef },
      include: { plan: true },
    });
    if (existingRef) {
      return existingRef;
    }

    // Cancel old active subscriptions for this user
    await prisma.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    const expiresAt = new Date();
    if (interval === 'year') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    return prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        provider,
        providerRef,
        status: 'ACTIVE',
        expiresAt,
      },
      include: { plan: true },
    });
  },

  async createInvoice(data: {
    userId: string;
    subscriptionId?: string;
    provider: PaymentProvider;
    providerRef: string;
    amount: number;
    currency?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  }) {
    const prisma = getPrisma();

    // Check for existing invoice
    const existing = await prisma.invoice.findUnique({
      where: { providerRef: data.providerRef },
    });
    if (existing) return existing;

    return prisma.invoice.create({
      data: {
        userId: data.userId,
        subscriptionId: data.subscriptionId,
        provider: data.provider,
        providerRef: data.providerRef,
        amount: Math.round(data.amount),
        currency: data.currency ?? 'USD',
        status: data.status ?? 'PENDING',
        paidAt: data.status === 'PAID' ? new Date() : undefined,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  },

  async verifyAndActivatePayment(transactionId: string | number, fallbackRef?: string, reqUser?: { authId: string; email: string; name?: string }) {
    const verifyData = await this.verifyFlutterwave(transactionId);
    if (verifyData.status !== 'success' || verifyData.data?.status !== 'successful') {
      throw new Error(`Flutterwave payment not successful: ${verifyData.message || 'Unknown error'}`);
    }

    const tx = verifyData.data;
    const ref = tx.tx_ref || fallbackRef || `QONA-FLW-${Date.now()}`;
    const parsedMeta = extractFlutterwaveMeta(tx.meta);
    const planSlug = parsedMeta.planSlug || 'starter';
    const interval = parsedMeta.interval || 'month';

    const prisma = getPrisma();
    let targetUserId = parsedMeta.userId;

    // 1. Try resolving DB user from parsedMeta.userId
    if (targetUserId) {
      const existing = await prisma.user.findFirst({
        where: { OR: [{ id: targetUserId }, { authId: targetUserId }] },
      });
      if (existing) targetUserId = existing.id;
    }

    // 2. Try resolving DB user from authenticated session user (reqUser)
    if (!targetUserId && reqUser) {
      let dbUser = await prisma.user.findFirst({
        where: { OR: [{ authId: reqUser.authId }, { email: reqUser.email }] },
      });
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: { authId: reqUser.authId, email: reqUser.email, name: reqUser.name || 'User' },
        });
      }
      targetUserId = dbUser.id;
    }

    // 3. Try resolving DB user from Flutterwave customer email
    if (!targetUserId && tx.customer?.email) {
      let dbUser = await prisma.user.findFirst({
        where: { email: tx.customer.email },
      });
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            authId: `fw-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            email: tx.customer.email,
            name: tx.customer.name || tx.customer.email.split('@')[0],
          },
        });
      }
      targetUserId = dbUser.id;
    }

    if (!targetUserId) {
      throw new Error('Transaction verified, but could not associate with a valid user record.');
    }

    const subscription = await this.createSubscription(targetUserId, planSlug, 'flutterwave', ref, interval);
    await this.createInvoice({
      userId: targetUserId,
      subscriptionId: subscription.id,
      provider: 'flutterwave',
      providerRef: ref,
      amount: tx.amount,
      currency: tx.currency || 'USD',
      status: 'PAID',
      metadata: { plan: planSlug, interval, email: tx.customer?.email, flutterwaveId: tx.id },
    });

    return subscription;
  },

  async handleFlutterwaveWebhook(payload: any) {
    if (payload.event === 'charge.completed' && payload.data?.status === 'successful') {
      const tx = payload.data;
      const ref = tx.tx_ref;
      const parsedMeta = extractFlutterwaveMeta(tx.meta);
      const planSlug = parsedMeta.planSlug || 'starter';
      const interval = parsedMeta.interval || 'month';

      const prisma = getPrisma();
      let targetUserId = parsedMeta.userId;

      if (targetUserId) {
        const existing = await prisma.user.findFirst({
          where: { OR: [{ id: targetUserId }, { authId: targetUserId }] },
        });
        if (existing) targetUserId = existing.id;
      }

      if (!targetUserId && tx.customer?.email) {
        let dbUser = await prisma.user.findFirst({ where: { email: tx.customer.email } });
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              authId: `fw-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              email: tx.customer.email,
              name: tx.customer.name || tx.customer.email.split('@')[0],
            },
          });
        }
        targetUserId = dbUser.id;
      }

      if (!targetUserId) throw new Error('Missing user metadata in webhook payload');

      const subscription = await this.createSubscription(targetUserId, planSlug, 'flutterwave', ref, interval);
      await this.createInvoice({
        userId: targetUserId,
        subscriptionId: subscription.id,
        provider: 'flutterwave',
        providerRef: ref,
        amount: tx.amount,
        currency: tx.currency || 'USD',
        status: 'PAID',
        metadata: { plan: planSlug, interval, email: tx.customer?.email, webhookEvent: payload.event },
      });
    }
  },

  async cancelSubscription(userId: string, _reason?: string) {
    const prisma = getPrisma();
    let subscription = await prisma.subscription.findFirst({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new Error('No subscription record found to cancel.');
    }

    try {
      if (subscription.provider === 'flutterwave' && config.FLUTTERWAVE_SECRET_KEY) {
        const invoice = await prisma.invoice.findFirst({
          where: { subscriptionId: subscription.id },
          orderBy: { createdAt: 'desc' },
        });
        const meta = (invoice?.metadata as Record<string, any>) || {};
        const subId = meta.flutterwaveId;
        if (subId) {
          await axios.put(
            `${FLUTTERWAVE_BASE}/subscriptions/${subId}/cancel`,
            {},
            { headers: { Authorization: `Bearer ${config.FLUTTERWAVE_SECRET_KEY}` } },
          ).catch(() => {});
        }
      }
    } catch {
      // Gracefully ignore third-party API error if already cancelled or one-time charge
    }

    // Ensure expiresAt is populated so user retains access for remaining duration
    const finalExpiresAt = subscription.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        expiresAt: finalExpiresAt,
      },
      include: { plan: true },
    });

    return updated;
  },
};
