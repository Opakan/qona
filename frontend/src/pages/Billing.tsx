import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertTriangle, 
  X, 
  ArrowRight, 
  Download, 
  Printer, 
  FileText, 
  Sparkles, 
  ChevronLeft, 
  ShieldCheck, 
  Eye,
  Bot,
  Layers,
  Send
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PaymentReceiptModal, InvoiceData } from '../components/shared/PaymentReceiptModal';

interface SubscriptionInfo {
  id: string;
  status: string;
  provider: string;
  providerRef: string;
  plan: { 
    name: string; 
    slug: string; 
    price: number;
    exports?: number;
    features?: string[];
    [key: string]: unknown 
  };
  invoices?: InvoiceData[];
  expiresAt?: string;
  cancelledAt?: string;
  remainingDays?: number;
  isAccessActive?: boolean;
}

const CANCEL_REASONS = [
  'Too expensive / looking for a lower tier',
  'Finished my current project',
  'Missing integrations or features I need',
  'Temporary pause — will return later',
  'Other reason',
];

export default function Billing() {
  const { user, dbUser, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Cancel modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Receipt modal state
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const fetchBillingData = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/payments/subscription');
      if (data?.subscription) {
        setSub(data.subscription);
      } else {
        setSub(null);
      }

      if (Array.isArray(data?.invoices) && data.invoices.length > 0) {
        setInvoices(data.invoices);
      } else if (Array.isArray(data?.subscription?.invoices)) {
        setInvoices(data.subscription.invoices);
      } else {
        // Fallback dedicated invoices endpoint
        try {
          const invRes = await apiClient.get('/payments/invoices');
          if (Array.isArray(invRes.data?.invoices)) {
            setInvoices(invRes.data.invoices);
          }
        } catch {
          // ignore fallback error
        }
      }
    } catch (err) {
      console.warn('[Billing] Failed to load subscription details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      const { data } = await apiClient.post('/payments/cancel', { reason: cancelReason });
      setCancelSuccess(data.message || 'Your subscription has been successfully cancelled.');
      setIsCancelModalOpen(false);
      if (data.subscription) {
        setSub(data.subscription);
      } else {
        fetchBillingData();
      }
      await refreshSubscription();
    } catch (err: any) {
      setCancelError(err?.response?.data?.message || err?.message || 'Failed to cancel subscription.');
    } finally {
      setIsCancelling(false);
    }
  };

  const isUnexpired = sub?.expiresAt ? new Date(sub.expiresAt) > new Date() : false;
  const isActive = sub && (sub.status === 'ACTIVE' || sub.isAccessActive);
  const isCancelled = sub && sub.status === 'CANCELLED';
  const hasAccessWhileCancelled = isCancelled && isUnexpired;

  const planSlug = (sub?.plan?.slug?.toLowerCase() || '') as 'starter' | 'pro' | 'enterprise' | '';
  const isStarter = planSlug === 'starter';
  const isPro = planSlug === 'pro';

  const downloadHtmlReceipt = (inv: InvoiceData) => {
    const receiptNumber = `INV-${(inv.providerRef || inv.id).replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase()}`;
    const planName = inv.subscription?.plan?.name || inv.metadata?.plan ? `${inv.metadata.plan.charAt(0).toUpperCase() + inv.metadata.plan.slice(1)} Plan` : (sub?.plan?.name || 'Starter Plan');
    const currency = (inv.currency || 'USD').toUpperCase();
    const amountFormatted = `$${Number(inv.amount).toFixed(2)} ${currency}`;
    const paymentDate = new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const clientName = dbUser?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Valued Subscriber';
    const clientEmail = dbUser?.email || user?.email || 'customer@qonace.com';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt ${receiptNumber} - Qonace</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 40px; background: #fff; }
    .receipt-container { max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 900; color: #4f46e5; letter-spacing: -0.5px; }
    .badge { background: #ecfdf5; color: #059669; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; border: 1px solid #a7f3d0; text-transform: uppercase; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; font-size: 13px; line-height: 1.6; }
    .info-title { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    td { padding: 14px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
    .totals { margin-left: auto; width: 280px; margin-bottom: 32px; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; color: #64748b; }
    .totals-total { display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #0f172a; font-size: 16px; font-weight: 800; color: #0f172a; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 24px; }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div>
        <div class="logo">Qonace AI</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">AI Automation &amp; n8n Workflow Studio</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">PAID • VERIFIED</span>
        <div style="font-size: 12px; font-weight: 700; color: #334155; margin-top: 8px;">${receiptNumber}</div>
      </div>
    </div>

    <div class="info-grid">
      <div>
        <div class="info-title">Billed To</div>
        <div style="font-weight: 700; color: #0f172a;">${clientName}</div>
        <div>${clientEmail}</div>
      </div>
      <div>
        <div class="info-title">Payment Info</div>
        <div><strong>Date:</strong> ${paymentDate}</div>
        <div><strong>Processor:</strong> Flutterwave</div>
        <div style="word-break: break-all;"><strong>Ref:</strong> ${inv.providerRef || inv.id}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${planName} Subscription</div>
            <div style="font-size: 12px; color: #64748b;">Full platform workflow generation &amp; n8n export access</div>
          </td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right; font-weight: 700;">${amountFormatted}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${amountFormatted}</span>
      </div>
      <div class="totals-row">
        <span>Taxes / VAT (0%)</span>
        <span>$0.00 USD</span>
      </div>
      <div class="totals-total">
        <span>Total Paid</span>
        <span>${amountFormatted}</span>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for building with Qonace! This receipt serves as official proof of payment for your accounting records.</p>
      <p>Need help? Contact support@qonace.com • https://qonace.com</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Qonace-Receipt-${receiptNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8 lg:py-16">
      {/* Top Navigation & Breadcrumb */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/chat"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Chat Studio</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Link
            to="/dashboard"
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
          >
            Dashboard
          </Link>
        </div>

        <Link
          to="/pricing"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center gap-1"
        >
          <span>Explore All Plans</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Page Header */}
      <div className="flex items-start justify-between border-b border-slate-200/80 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              <CreditCard className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black font-display tracking-tight text-slate-950 dark:text-white">
              Billing &amp; Payment History
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Manage your active subscription tier, inspect payment transactions, and download official receipts.
          </p>
        </div>
      </div>

      {cancelSuccess && (
        <div className="mt-6 flex items-start justify-between rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{cancelSuccess}</span>
          </div>
          <button onClick={() => setCancelSuccess(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {cancelError && (
        <div className="mt-6 flex items-start justify-between rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-4 text-xs font-semibold text-red-800 dark:text-red-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{cancelError}</span>
          </div>
          <button onClick={() => setCancelError(null)} className="text-red-600 dark:text-red-400 hover:opacity-80">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-xs text-slate-400">Loading your billing details...</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* SECTION 1: Active Subscription Card */}
          {!sub ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">No Active Subscription</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                You are currently in the free preview sandbox. Upgrade to Starter ($1/mo) or Pro to unlock Claude AI workflow creation and direct n8n exports.
              </p>
              <Link
                to="/pricing"
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <span>Subscribe Starting at $1</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Active Tier
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                        : hasAccessWhileCancelled
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {isActive ? 'Active Subscription' : hasAccessWhileCancelled ? 'Cancelled (Access Active)' : 'Expired'}
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline gap-2">
                    <h2 className="text-2xl font-black font-display text-slate-900 dark:text-white">
                      {sub.plan.name} Plan
                    </h2>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      (${sub.plan.price}/month)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isStarter && (
                    <Link
                      to="/pricing"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                      <span>Upgrade to Pro ($30/mo)</span>
                    </Link>
                  )}

                  {isActive && (
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
                    >
                      Cancel Auto-Renewal
                    </button>
                  )}
                </div>
              </div>

              {/* Tier Limits & Feature Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>AI Engine</span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {isStarter ? 'Claude 3.5 Haiku' : isPro ? 'Claude 3.7 Sonnet' : 'Custom Fine-Tuned'}
                  </div>
                  <div className="text-[10px] text-slate-400">Standard workflow generation</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Monthly Exports</span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                    {isStarter ? '10 exports / month' : isPro ? '100 exports / month' : 'Unlimited'}
                  </div>
                  <div className="text-[10px] text-slate-400">Direct n8n JSON exports</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                    <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span>Payment Gateway</span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white capitalize">
                    {sub.provider || 'Flutterwave'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate" title={sub.providerRef}>
                    {sub.providerRef}
                  </div>
                </div>
              </div>

              {/* Renewal info banner */}
              <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                {sub.expiresAt && (
                  <p>
                    {isActive ? 'Renews automatically on:' : 'Access valid until:'}{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {new Date(sub.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </strong>
                    {sub.remainingDays !== undefined && (
                      <span className="ml-1 text-slate-400">({sub.remainingDays} days remaining in current period)</span>
                    )}
                  </p>
                )}
                {hasAccessWhileCancelled && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300">
                    <strong>Auto-Renewal Stopped:</strong> You won't be charged again, and you retain full access to your <strong>{sub.plan.name}</strong> features until {new Date(sub.expiresAt!).toLocaleDateString()}.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 2: Payment History & Invoices */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black font-display text-slate-900 dark:text-white">
                  Payment History &amp; Invoices
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Official payment receipts and downloadable tax invoices for your records.
                </p>
              </div>

              <span className="text-xs font-bold text-slate-400">
                {invoices.length} {invoices.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            {invoices.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No past invoices or payment transactions found on this account yet.
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-850/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-extrabold border-b border-slate-200/80 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Invoice / Ref</th>
                        <th className="py-3 px-4">Plan / Description</th>
                        <th className="py-3 px-4">Date &amp; Time</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Receipt Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {invoices.map((inv) => {
                        const receiptNumber = `INV-${(inv.providerRef || inv.id).replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase()}`;
                        const planLabel = inv.subscription?.plan?.name || inv.metadata?.plan ? `${inv.metadata.plan.charAt(0).toUpperCase() + inv.metadata.plan.slice(1)} Plan` : (sub?.plan?.name || 'Starter Plan');
                        const isPaid = inv.status === 'PAID';

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-200">
                              {receiptNumber}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">{planLabel}</div>
                              <div className="text-[10px] text-slate-400 capitalize">Via {inv.provider || 'Flutterwave'}</div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                              <div>{new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                              <div className="text-[10px] text-slate-400">{new Date(inv.paidAt || inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>

                            <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                              ${Number(inv.amount).toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">{inv.currency || 'USD'}</span>
                            </td>

                            <td className="py-3.5 px-4">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                  <CheckCircle2 className="h-3 w-3" />
                                  PAID
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                  <XCircle className="h-3 w-3" />
                                  {inv.status}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setIsReceiptModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                  title="View official payment receipt modal"
                                >
                                  <Eye className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                  <span>View</span>
                                </button>

                                <button
                                  onClick={() => downloadHtmlReceipt(inv)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white rounded-lg transition-all cursor-pointer"
                                  title="Download standalone HTML invoice"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Download</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAYMENT RECEIPT MODAL */}
      <PaymentReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        invoice={selectedInvoice}
        customerName={dbUser?.name || user?.user_metadata?.full_name}
        customerEmail={dbUser?.email || user?.email}
      />

      {/* CANCEL CONFIRMATION MODAL */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7">
            <button
              onClick={() => setIsCancelModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black font-display text-slate-900 dark:text-white">
                  Cancel Auto-Renewal?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You can stop auto-renew anytime with no penalties.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Retain Paid Days:</strong> Auto-renewal will be turned off immediately so you will not be charged on your next cycle. You retain 100% active access to your <strong>{sub?.plan?.name || 'Starter'}</strong> features until {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'period end'}.
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Why are you cancelling? (Optional)
              </label>
              <div className="space-y-1.5">
                {CANCEL_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      cancelReason === reason
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel_reason"
                      value={reason}
                      checked={cancelReason === reason}
                      onChange={() => setCancelReason(reason)}
                      className="text-indigo-600"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Keep Plan
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                {isCancelling ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span>Cancelling...</span></>
                ) : (
                  <span>Confirm Cancellation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
