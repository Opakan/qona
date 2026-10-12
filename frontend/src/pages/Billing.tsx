import React, { useEffect, useState, useMemo } from 'react';
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
  Copy,
  Check,
  Calendar,
  Zap,
  Lock,
  Receipt,
  Search,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PaymentReceiptModal, InvoiceData } from '../components/shared/PaymentReceiptModal';
import { generateReceiptPdf } from '../utils/generateReceiptPdf';
import ThemeToggle from '../components/shared/ThemeToggle';

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
    [key: string]: unknown;
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

  const defaultCap = isStarter ? 10 : isPro ? 100 : 0;
  const cap = sub?.exportQuota?.cap ?? defaultCap;
  const used = sub?.exportQuota?.used ?? 0;
  const remaining = sub?.exportQuota?.remaining ?? (isActive ? Math.max(0, cap - used) : 0);
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

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#070a12] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">Plan &amp; Billing</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/pricing"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              <span>Compare All Plans</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Global Notifications */}
        {cancelSuccess && (
          <div className="flex items-start justify-between rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{cancelSuccess}</span>
            </div>
            <button onClick={() => setCancelSuccess(null)} className="text-emerald-600 dark:text-emerald-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {cancelError && (
          <div className="flex items-start justify-between rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-4 text-xs font-semibold text-red-800 dark:text-red-300">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{cancelError}</span>
            </div>
            <button onClick={() => setCancelError(null)} className="text-red-600 dark:text-red-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="my-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs font-bold text-slate-400">Loading billing details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* MASTER ACTIVE PLAN CARD */}
            {!sub ? (
              <div className="overflow-hidden rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 sm:p-10 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-4">
                  <CreditCard className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-black font-display text-slate-900 dark:text-white">Free Sandbox Tier</h2>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  You are currently on the free preview tier. Upgrade to Starter ($1/mo) or Pro ($30/mo) for instant AI workflow node orchestration and direct production n8n exports.
                </p>
                <Link
                  to="/pricing"
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  <span>Activate Plan Starting at $1</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs">
                {/* Clean Top Strip */}
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                          {isActive ? 'Active Plan' : 'Cancelled'}
                        </span>

                        <span className="text-xs font-semibold text-slate-400">
                          Renews {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'monthly'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline gap-2">
                        <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900 dark:text-white">
                          {sub.plan.name}
                        </h1>
                        <span className="text-base font-bold text-slate-500 dark:text-slate-400">
                          ${sub.plan.price}/mo
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span>Payment processed securely via <strong className="capitalize text-slate-700 dark:text-slate-300">{sub.provider || 'Flutterwave'}</strong></span>
                        {sub.providerRef && (
                          <button
                            type="button"
                            onClick={() => handleCopyRef(sub.providerRef)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-1"
                            title="Copy reference"
                          >
                            {copiedRef ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedRef ? 'Copied' : 'Ref'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Top Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isStarter && (
                        <Link
                          to="/pricing"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                          <span>Upgrade to Pro ($30/mo)</span>
                        </Link>
                      )}

                      {latestInvoice && (
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(latestInvoice)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Receipt (PDF)</span>
                        </button>
                      )}

                      {isActive && (
                        <button
                          type="button"
                          onClick={() => setIsCancelModalOpen(true)}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-bold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Export Allowance Progress Section */}
                  <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800/80 p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Monthly Workflow Exports</span>
                      </span>

                      <div className="text-right">
                        <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm">{remaining}</span>
                        <span className="text-slate-400 text-xs"> / {cap} Available</span>
                      </div>
                    </div>

                    <div className="h-2.5 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, 100 - usagePercent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>{used} workflows exported this cycle</span>
                      <span>Resets on {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'renewal'}</span>
                    </div>
                  </div>

                  {/* Grace period warning if cancelled */}
                  {hasAccessWhileCancelled && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>
                        Auto-renewal cancelled. You retain full access to your {sub.plan.name} features and remaining exports until {new Date(sub.expiresAt!).toLocaleDateString()}.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* INVOICES & PAYMENT HISTORY */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                    <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Invoices &amp; Receipts</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Download official payment receipts for tax and accounting.
                  </p>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        statusFilter === 'all'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-500 dark:text-slate-400'
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
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      Paid
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ref or plan..."
                      className="h-8.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No invoices found matching your criteria.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                  {/* Desktop Table View */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 dark:bg-slate-850/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <tr>
                          <th className="px-5 py-3">Receipt / Ref</th>
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3">Plan</th>
                          <th className="px-5 py-3">Amount</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredInvoices.map((inv) => {
                          const receiptNumber = `INV-${(inv.providerRef || inv.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
                          const isPaid = inv.status === 'PAID';
                          const planLabel = inv.subscription?.plan?.name || (inv.metadata as any)?.plan ? `${(inv.metadata as any).plan.charAt(0).toUpperCase() + (inv.metadata as any).plan.slice(1)} Plan` : (sub?.plan?.name || 'Starter Plan');

                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                              <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                                {receiptNumber}
                              </td>
                              <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                                {new Date(inv.paidAt || inv.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                                {planLabel}
                              </td>
                              <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                                ${Number(inv.amount).toFixed(2)}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                  isPaid
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                  {inv.status}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedInvoice(inv);
                                      setIsReceiptModalOpen(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                    title="View receipt details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPdf(inv)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    title="Download PDF"
                                  >
                                    <Download className="h-3 w-3" />
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

        {/* CANCEL SUBSCRIPTION MODAL */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
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
                    You can cancel anytime with no termination fees.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Auto-renewal will be turned off. You will keep 100% active access to your <strong>{sub?.plan?.name || 'Starter'}</strong> features until {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'period end'}.
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Feedback Reason (Optional)
                </label>
                <div className="space-y-1.5">
                  {CANCEL_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        cancelReason === reason
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
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
