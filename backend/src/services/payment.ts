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
          title: 'Qona Automation',
          description: `${params.planSlug.toUpperCase()} Plan (${interval === 'year' ? 'Annual - 20% Off' : 'Monthly'})`,
          logo: `${config.APP_URL}/favicon.ico`,
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
    const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } });
    if (!plan) throw new Error(`Plan '${planSlug}' not found`);

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

  async verifyAndActivatePayment(transactionId: string | number, fallbackRef?: string) {
    const verifyData = await this.verifyFlutterwave(transactionId);
    if (verifyData.status !== 'success' || verifyData.data?.status !== 'successful') {
      throw new Error(`Flutterwave payment not successful: ${verifyData.message || 'Unknown error'}`);
    }

    const tx = verifyData.data;
    const ref = tx.tx_ref || fallbackRef;
    const meta = tx.meta ?? {};
    const userId = meta.userId as string;
    const planSlug = meta.plan as string;
    const interval = (meta.interval as 'month' | 'year') || 'month';

    if (!userId || !planSlug) {
      throw new Error('Transaction metadata is missing userId or plan');
    }

    const subscription = await this.createSubscription(userId, planSlug, 'flutterwave', ref, interval);
    await this.createInvoice({
      userId,
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
      const meta = tx.meta ?? {};
      const userId = meta.userId as string;
      const planSlug = meta.plan as string;
      const interval = (meta.interval as 'month' | 'year') || 'month';

      if (!userId || !planSlug) throw new Error('Missing metadata in webhook payload');

      const subscription = await this.createSubscription(userId, planSlug, 'flutterwave', ref, interval);
      await this.createInvoice({
        userId,
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
};
