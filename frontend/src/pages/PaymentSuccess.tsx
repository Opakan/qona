import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Copy,
  Check,
  Receipt,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import apiClient from '../api/client';

interface PlanDetails {
  name: string;
  priceFormatted: string;
  badge: string;
  benefits: string[];
}

const PLAN_BENEFITS: Record<string, PlanDetails> = {
  starter: {
    name: 'Starter Plan',
    priceFormatted: '$1',
    badge: 'Essential Toolkit',
    benefits: [
      '10 workflow exports per month',
      'Standard AI generation & workflow assistant',
      'n8n & standard JSON export formats',
      'Community support & template library access',
    ],
  },
  pro: {
    name: 'Pro Plan',
    priceFormatted: '$30',
    badge: 'Most Popular',
    benefits: [
      '100 workflow exports per month',
      'Advanced Claude 3.5 AI workflow engine',
      'All platform exports (n8n, Zapier, Make, JSON)',
      'Unlimited version history & rollbacks',
      'Priority email support & faster generation queues',
    ],
  },
  enterprise: {
    name: 'Enterprise Plan',
    priceFormatted: '$99',
    badge: 'Full Power',
    benefits: [
      'Unlimited workflow exports & execution simulator',
      'Custom AI agent fine-tuning & prompt logic',
      'Complete 2,900+ template catalog & instant clones',
      'Full REST API access & outbound webhook automation',
      'Dedicated 24/7 priority engineering support',
    ],
  },
};

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [copied, setCopied] = useState(false);
  const provider = searchParams.get('provider') || 'flutterwave';
  const planSlug = (searchParams.get('plan') || 'pro').toLowerCase();
  const txRef = searchParams.get('tx_ref') || searchParams.get('reference') || '';
  const transactionId = searchParams.get('transaction_id') || searchParams.get('transactionId') || '';

  const planInfo = PLAN_BENEFITS[planSlug] || PLAN_BENEFITS.pro;

  useEffect(() => {
    const verify = async () => {
      try {
        const paymentStatus = searchParams.get('status');

        if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
          setStatus('error');
          return;
        }

        const queryParams = new URLSearchParams();
        if (txRef) queryParams.set('reference', txRef);
        if (transactionId) queryParams.set('transaction_id', transactionId);
        if (provider) queryParams.set('provider', provider);

        await apiClient.get(`/payments/verify?${queryParams.toString()}`);
        setStatus('success');

        // Trigger celebratory confetti burst
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#4f46e5', '#6366f1', '#10b981', '#fbbf24', '#ffffff'],
        });
      } catch {
        setStatus('error');
      }
    };
    verify();
  }, [searchParams, provider, txRef, transactionId]);

  const handleCopyRef = () => {
    if (txRef || transactionId) {
      navigator.clipboard.writeText(txRef || transactionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/40 via-white to-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {status === 'loading' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-indigo-600" />
            <h1 className="mt-6 text-2xl font-bold text-slate-900">Verifying your payment...</h1>
            <p className="mt-2 text-sm text-slate-500">
              Connecting securely with Flutterwave to confirm and activate your subscription.
            </p>
          </div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-10 shadow-xl shadow-slate-200/50"
          >
            {/* Header / Success Badge */}
            <div className="text-center">
              <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">
                Payment Successful!
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Welcome aboard! Your subscription is confirmed and fully active.
              </p>
            </div>

            {/* Receipt / Plan Summary Card */}
            <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/80 p-5">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Plan Activated
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                  <Sparkles className="h-3 w-3" />
                  {planInfo.badge}
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{planInfo.name}</h3>
                  <p className="text-xs text-slate-500">Billed securely via Flutterwave</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900">{planInfo.priceFormatted}</span>
                </div>
              </div>

              {(txRef || transactionId) && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-200/70 text-xs text-slate-600">
                  <span className="font-mono text-[11px] truncate max-w-[240px] sm:max-w-[320px]">
                    Ref: {txRef || transactionId}
                  </span>
                  <button
                    onClick={handleCopyRef}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Unlocked Benefits */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Unlocked Benefits & Features
              </h4>
              <ul className="mt-3 space-y-2.5">
                {planInfo.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <div className="mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                      <Zap className="h-3 w-3 fill-current" />
                    </div>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="mt-8 space-y-3">
              <Link
                to="/chat"
                className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <span>Launch AI Workflow Studio</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/dashboard"
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Browse Templates</span>
                </Link>
                <Link
                  to="/billing"
                  className="py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Manage Billing</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <div className="rounded-3xl border border-red-100 bg-white p-8 sm:p-10 text-center shadow-lg shadow-red-100/50">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-8 ring-red-50/50">
              <XCircle className="h-9 w-9" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Payment Verification Issue</h1>
            <p className="mt-2 text-sm text-slate-500">
              We could not verify the payment confirmation. If you completed the payment, your plan will activate automatically via our webhook within 1-2 minutes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/pricing"
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Return to Pricing
              </Link>
              <Link
                to="/billing"
                className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Check Billing History
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
