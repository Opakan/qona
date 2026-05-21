import axios from 'axios';
import type { Prisma } from '@prisma/client';
import { config } from '../config.js';
import { getPrisma } from '../lib/prisma.js';

const FLUTTERWAVE_BASE = 'https://api.flutterwave.com/v3';

export type PaymentProvider = 'flutterwave';

interface InitPaymentParams {
  email: string;
  amount: number;
  planSlug: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

interface PaymentResult {
  provider: PaymentProvider;
  authorizationUrl: string;
  reference: string;
}

export const paymentService = {
  async initFlutterwave(params: InitPaymentParams): Promise<PaymentResult> {
    const ref = `QONA-FLW-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { data } = await axios.post(
      `${FLUTTERWAVE_BASE}/payments`,
      {
        tx_ref: ref,
        amount: params.amount,
        currency: 'USD',
        redirect_url: `${config.APP_URL}/payment/success?provider=flutterwave&plan=${params.planSlug}`,
        customer: {
          email: params.email,
          name: (params.metadata?.name as string) ?? params.email,
        },
        meta: {
          userId: params.userId,
          plan: params.planSlug,
        },
        customizations: {
          title: 'Qona',
          description: `${params.planSlug} Plan`,
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

  async createSubscription(userId: string, planSlug: string, provider: PaymentProvider, providerRef: string) {
    const prisma = getPrisma();
    const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } });
    if (!plan) throw new Error('Plan not found');

    const existing = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    }

    const expiresAt = new Date();
    if (plan.interval === 'month') expiresAt.setMonth(expiresAt.getMonth() + 1);
    else if (plan.interval === 'year') expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    return prisma.subscription.create({
      data: { userId, planId: plan.id, provider, providerRef, status: 'ACTIVE', expiresAt },
    });
  },

  async createInvoice(data: {
    userId: string;
    subscriptionId?: string;
    provider: PaymentProvider;
    providerRef: string;
    amount: number;
    status?: string;
    metadata?: Record<string, unknown>;
  }) {
    const prisma = getPrisma();
    return prisma.invoice.create({
      data: {
        userId: data.userId,
        subscriptionId: data.subscriptionId,
        provider: data.provider,
        providerRef: data.providerRef,
        amount: data.amount,
        currency: 'USD',
        status: data.status ?? 'PENDING',
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  },

  async handleFlutterwaveWebhook(payload: any) {
    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const ref = payload.data.tx_ref;
      const meta = payload.data.meta ?? {};
      const userId = meta.userId as string;
      const planSlug = meta.plan as string;

      if (!userId || !planSlug) throw new Error('Missing meta');

      const subscription = await this.createSubscription(userId, planSlug, 'flutterwave', ref);
      await this.createInvoice({
        userId,
        subscriptionId: subscription.id,
        provider: 'flutterwave',
        providerRef: ref,
        amount: payload.data.amount,
        status: 'PAID',
        metadata: { plan: planSlug, email: payload.data.customer?.email },
      });
    }
  },
};
