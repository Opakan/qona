import { useEffect, useState, useMemo } from 'react';
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
  FileText, 
  Sparkles, 
  ChevronLeft, 
  ShieldCheck, 
  Eye,
  Layers,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  Zap,
  Lock,
  Receipt,
  Search,
  ArrowUpRight,
  BadgeCheck,
  Clock
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PaymentReceiptModal, InvoiceData } from '../components/shared/PaymentReceiptModal';
import { generateReceiptPdf } from '../utils/generateReceiptPdf';

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
  exportQuota?: {
    cap: number;
    used: number;
    remaining: number;
    periodStart: string | Date;
    periodEnd: string | Date | null;
    planSlug: string;
    planName: string;
    isActive: boolean;
    canExport: boolean;
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
  
  // Search and filter for invoices
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [copiedRef, setCopiedRef] = useState(false);

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
  const isEnterprise = planSlug === 'enterprise';

  const defaultCap = isStarter ? 10 : isPro ? 100 : isEnterprise ? 1000 : 0;
  const cap = sub?.exportQuota?.cap ?? defaultCap;
  const used = sub?.exportQuota?.used ?? 0;
  const remaining = sub?.exportQuota?.remaining ?? (isActive ? Math.max(0, cap - used) : 0);
  const remainingExportsText = `${remaining} Exports`;
  const usagePercent = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  const latestInvoice = invoices?.[0] || sub?.invoices?.[0];

  const handleDownloadPdf = (inv: InvoiceData) => {
    generateReceiptPdf(
      inv,
      dbUser?.name || user?.user_metadata?.full_name,
      dbUser?.email || user?.email
    );
  };

  const handleCopyRef = (refText: string) => {
    if (!refText) return;
    navigator.clipboard.writeText(refText);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus = 
        statusFilter === 'all' 
          ? true 
          : statusFilter === 'paid' 
            ? inv.status === 'PAID' 
            : inv.status !== 'PAID';
      
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesStatus;

      const receiptRef = (inv.providerRef || inv.id).toLowerCase();
      const planName = (inv.subscription?.plan?.name || (inv.metadata as any)?.plan || '').toLowerCase();
      const amount = String(inv.amount);

      return matchesStatus && (receiptRef.includes(query) || planName.includes(query) || amount.includes(query));
    });
  }, [invoices, statusFilter, searchQuery]);

  const totalSpent = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'PAID')
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [invoices]);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              to="/chat"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Chat Studio</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <Link
              to="/dashboard"
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
            >
              Dashboard
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              Billing &amp; Invoices
            </span>
          </div>

          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          >
            <span>Compare All Plans</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Page Header */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/15 dark:to-purple-500/15 blur-3xl" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 mb-3">
                <Receipt className="h-3.5 w-3.5" />
                <span>Subscription &amp; Invoicing Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-950 dark:text-white">
                Billing &amp; Payment History
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-medium leading-relaxed">
                Manage your active subscription plan, monitor monthly workflow export quotas, and download official payment receipts.
              </p>
            </div>

            {sub && isStarter && (
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-size-200 hover:bg-pos-100 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shrink-0"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>Upgrade to Pro ($30/mo)</span>
              </Link>
            )}
          </div>
        </div>

        {/* Global Notifications */}
        {cancelSuccess && (
          <div className="mb-6 flex items-start justify-between rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-300 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{cancelSuccess}</span>
            </div>
            <button onClick={() => setCancelSuccess(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {cancelError && (
          <div className="mb-6 flex items-start justify-between rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-4 text-xs font-semibold text-red-800 dark:text-red-300 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{cancelError}</span>
            </div>
            <button onClick={() => setCancelError(null)} className="text-red-600 dark:text-red-400 hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="my-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs font-bold text-slate-400">Loading your billing details...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* EXECUTIVE STATS STRIP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Active Tier */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 p-4 backdrop-blur-md shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Current Plan
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40 dark:border-indigo-800/40">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-lg font-black font-display text-slate-900 dark:text-white">
                    {sub?.plan?.name || 'Free Preview'}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                        : hasAccessWhileCancelled
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {isActive ? 'Active' : hasAccessWhileCancelled ? 'Cancelled (Grace Period)' : 'Inactive'}
                    </span>
                    {sub?.plan?.price !== undefined && (
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        ${sub.plan.price}/mo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Export Quota */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 p-4 backdrop-blur-md shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Workflow Quota
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/40 dark:border-purple-800/40">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-lg font-black font-display text-slate-900 dark:text-white">
                    {remaining} / {cap} Available
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>{used} exported this cycle</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">No Rollover</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Next Billing Date */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 p-4 backdrop-blur-md shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Next Billing Cycle
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-800/40">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-lg font-black font-display text-slate-900 dark:text-white">
                    {sub?.expiresAt
                      ? new Date(sub.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400 font-medium">
                    {sub?.remainingDays !== undefined ? `${sub.remainingDays} days remaining` : 'Monthly renewal'}
                  </div>
                </div>
              </div>

              {/* Card 4: Total Spend */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 p-4 backdrop-blur-md shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Total Invoiced
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/40 dark:border-amber-800/40">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-lg font-black font-display text-slate-900 dark:text-white">
                    ${totalSpent.toFixed(2)} USD
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    <span>Verified Transactions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 1: MASTER PLAN & QUOTA CARD */}
            {!sub ? (
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-10 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 mb-4">
                  <CreditCard className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-black font-display text-slate-900 dark:text-white">No Active Subscription</h3>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  You are currently on the free sandbox tier. Upgrade to Starter ($1/mo) or Pro ($30/mo) to unlock full AI workflow generation, direct n8n exports, and automated node orchestration.
                </p>
                <Link
                  to="/pricing"
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <span>Subscribe Starting at $1</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
                {/* Plan Card Header */}
                <div className="border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/80 via-white to-indigo-50/30 dark:from-slate-900/80 dark:via-slate-900 dark:to-indigo-950/20 p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                          Active Tier Details
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          {isActive ? 'Active Subscription' : 'Cancelled'}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2.5">
                        <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900 dark:text-white">
                          {sub.plan.name} Plan
                        </h2>
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                          (${sub.plan.price}/month)
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Payment processed securely via <strong className="text-slate-800 dark:text-slate-200 capitalize">{sub.provider || 'Flutterwave'}</strong>.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {latestInvoice && (
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(latestInvoice)}
                          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 px-4 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer shadow-2xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Latest Receipt (PDF)</span>
                        </button>
                      )}

                      {isStarter && (
                        <Link
                          to="/pricing"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                          <span>Upgrade Tier</span>
                        </Link>
                      )}

                      {isActive && (
                        <button
                          type="button"
                          onClick={() => setIsCancelModalOpen(true)}
                          className="rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                        >
                          Cancel Renewal
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quota Progress Bar Section */}
                <div className="p-6 sm:p-8 space-y-6">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Monthly Workflow Export Allocation</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Exports remaining for the current billing cycle. Resets on each renewal.
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xl font-black font-display text-indigo-600 dark:text-indigo-400">
                          {remaining}
                        </span>
                        <span className="text-xs font-bold text-slate-400"> / {cap} Exports Left</span>
                      </div>
                    </div>

                    {/* Modern Glowing Progress Bar */}
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-full transition-all duration-700 shadow-sm"
                        style={{ width: `${Math.max(5, 100 - usagePercent)}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>{used} workflows exported</span>
                      <span>Strict cap: {cap} exports/mo</span>
                    </div>
                  </div>

                  {/* Included Plan Features Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
                    <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800/70 flex flex-col justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Monthly Exports</span>
                      </div>
                      <div className="mt-2 text-base font-black font-display text-slate-900 dark:text-white">
                        {remainingExportsText}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400 font-medium">
                        Capped at {cap}/month
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800/70 flex flex-col justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Direct n8n Export</span>
                      </div>
                      <div className="mt-2 text-base font-black font-display text-slate-900 dark:text-white">
                        {remainingExportsText}
                      </div>
                      <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        Native n8n JSON Schema
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800/70 flex flex-col justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>AI Workflow Engine</span>
                      </div>
                      <div className="mt-2 text-base font-black font-display text-slate-900 dark:text-white">
                        Active &amp; Ready
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400 font-medium">
                        Instant Node Orchestration
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800/70 flex flex-col justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <RefreshCw className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>Rollover Policy</span>
                      </div>
                      <div className="mt-2 text-base font-black font-display text-slate-900 dark:text-white">
                        Zero Rollover
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400 font-medium">
                        Resets each month
                      </div>
                    </div>
                  </div>

                  {/* Clean Gateway & Reference Details Strip */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-850/60 border border-slate-200/60 dark:border-slate-800/80 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Secure Payment Gateway:</span>
                          <span className="capitalize text-indigo-600 dark:text-indigo-400 font-extrabold">{sub.provider || 'Flutterwave'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                          <span>Ref: {sub.providerRef ? `${sub.providerRef.slice(0, 16)}...` : 'N/A'}</span>
                          {sub.providerRef && (
                            <button
                              type="button"
                              onClick={() => handleCopyRef(sub.providerRef)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                              title="Copy transaction reference"
                            >
                              {copiedRef ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedRef ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      {sub.expiresAt && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {isActive ? 'Next Auto-Renewal:' : 'Access Active Until:'}{' '}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {new Date(sub.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {hasAccessWhileCancelled && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold">Auto-Renewal Disabled:</strong> You will not be billed again. You retain full active access to your <strong>{sub.plan.name}</strong> features and remaining exports until {new Date(sub.expiresAt!).toLocaleDateString()}.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 2: PAYMENT HISTORY & INVOICES */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black font-display tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Payment History &amp; Invoices</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Download verified tax receipts, view invoice line items, and inspect transaction statuses.
                  </p>
                </div>

                {/* Filter and Search Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Status Pills */}
                  <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        statusFilter === 'all'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      All ({invoices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('paid')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        statusFilter === 'paid'
                          ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Paid
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('pending')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        statusFilter === 'pending'
                          ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-2xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Other
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ref or plan..."
                      className="h-8.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-3 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-12 text-center shadow-xs">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">No payment transactions found</h4>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                    {searchQuery ? 'No invoices match your current search or filter criteria.' : 'When you complete a subscription payment, your official invoices and downloadable receipts will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-xs">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 dark:bg-slate-850/80 text-slate-400 dark:text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                        <tr>
                          <th className="py-3.5 px-5">Invoice Reference</th>
                          <th className="py-3.5 px-5">Plan Description</th>
                          <th className="py-3.5 px-5">Date &amp; Time</th>
                          <th className="py-3.5 px-5">Amount</th>
                          <th className="py-3.5 px-5">Status</th>
                          <th className="py-3.5 px-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredInvoices.map((inv) => {
                          const receiptNumber = `INV-${(inv.providerRef || inv.id).replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase()}`;
                          const planLabel = inv.subscription?.plan?.name || (inv.metadata as any)?.plan ? `${(inv.metadata as any).plan.charAt(0).toUpperCase() + (inv.metadata as any).plan.slice(1)} Plan` : (sub?.plan?.name || 'Starter Plan');
                          const isPaid = inv.status === 'PAID';

                          return (
                            <tr key={inv.id} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                                  <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                                  <span>{receiptNumber}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                                  ID: {inv.id.slice(0, 14)}...
                                </div>
                              </td>

                              <td className="py-4 px-5">
                                <div className="font-bold text-slate-900 dark:text-white">{planLabel}</div>
                                <div className="text-[10px] text-slate-400 capitalize">
                                  Via {inv.provider || 'Flutterwave'}
                                </div>
                              </td>

                              <td className="py-4 px-5 text-slate-600 dark:text-slate-400">
                                <div className="font-semibold text-slate-900 dark:text-slate-200">
                                  {new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(inv.paidAt || inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>

                              <td className="py-4 px-5">
                                <div className="text-sm font-black font-display text-slate-900 dark:text-white">
                                  ${Number(inv.amount).toFixed(2)}
                                </div>
                                <div className="text-[10px] text-slate-400 font-semibold uppercase">
                                  {inv.currency || 'USD'}
                                </div>
                              </td>

                              <td className="py-4 px-5">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    PAID
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                    <XCircle className="h-3 w-3 text-amber-500" />
                                    {inv.status}
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-5 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      setIsReceiptModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>View</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPdf(inv)}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Responsive Cards */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
                    {filteredInvoices.map((inv) => {
                      const receiptNumber = `INV-${(inv.providerRef || inv.id).replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase()}`;
                      const planLabel = inv.subscription?.plan?.name || (inv.metadata as any)?.plan ? `${(inv.metadata as any).plan.charAt(0).toUpperCase() + (inv.metadata as any).plan.slice(1)} Plan` : (sub?.plan?.name || 'Starter Plan');
                      const isPaid = inv.status === 'PAID';

                      return (
                        <div key={inv.id} className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {receiptNumber}
                            </span>
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
                          </div>

                          <div className="flex items-baseline justify-between">
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">{planLabel}</div>
                              <div className="text-[11px] text-slate-400">
                                {new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black font-display text-slate-900 dark:text-white">
                                ${Number(inv.amount).toFixed(2)}
                              </div>
                              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                                {inv.currency || 'USD'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setIsReceiptModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
                            >
                              <Eye className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(inv)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                            >
                              <Download className="h-3 w-3" />
                              <span>Download PDF</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    You can stop auto-renew anytime with no penalties.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <strong>Retain Full Active Period:</strong> Auto-renewal will be stopped immediately. You will not be charged again, and you retain 100% active access to your <strong>{sub?.plan?.name || 'Starter'}</strong> features and export quota until {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'billing period end'}.
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Why are you cancelling? (Optional)
                </label>
                <div className="space-y-1.5">
                  {CANCEL_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        cancelReason === reason
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancel_reason"
                        value={reason}
                        checked={cancelReason === reason}
                        onChange={() => setCancelReason(reason)}
                        className="text-indigo-600 accent-indigo-600"
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
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Keep Plan
                </button>
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={isCancelling}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
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
    </div>
  );
}
