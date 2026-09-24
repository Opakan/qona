import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, XCircle, Loader2, AlertTriangle, X, ShieldAlert, ArrowRight } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

interface SubscriptionInfo {
  id: string;
  status: string;
  provider: string;
  plan: { name: string; slug: string; [key: string]: unknown };
  invoices: Array<{ id: string; amount: number; status: string; createdAt: string }>;
  expiresAt?: string;
  cancelledAt?: string;
}

const CANCEL_REASONS = [
  'Too expensive / looking for a lower tier',
  'Finished my current project',
  'Missing integrations or features I need',
  'Temporary pause — will return later',
  'Other reason',
];

export default function Billing() {
  const { refreshSubscription } = useAuth();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchSubscription = () => {
    setLoading(true);
    apiClient.get('/payments/subscription')
      .then(({ data }) => setSub(data.subscription))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubscription();
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
        fetchSubscription();
      }
      await refreshSubscription();
    } catch (err: any) {
      setCancelError(err?.response?.data?.message || err?.message || 'Failed to cancel subscription.');
    } finally {
      setIsCancelling(false);
    }
  };

  const isActive = sub && sub.status === 'ACTIVE';
  const isCancelled = sub && sub.status === 'CANCELLED';

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6 lg:py-20">
      <div className="flex items-center gap-3">
        <CreditCard className="h-5 w-5 text-gray-400 dark:text-slate-500" />
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Billing &amp; Subscriptions</h1>
      </div>

      {cancelSuccess && (
        <div className="mt-6 flex items-start justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-300 animate-in fade-in">
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
        <div className="mt-6 flex items-start justify-between rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 p-4 text-xs font-semibold text-red-800 dark:text-red-300 animate-in fade-in">
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
        <div className="mt-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-slate-500" />
        </div>
      ) : !sub ? (
        <div className="mt-8 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 text-center shadow-xs">
          <p className="text-sm text-gray-500 dark:text-slate-400">No active subscription found. Plans start at just $1/month.</p>
          <a href="/pricing" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gray-900 dark:bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-gray-800 dark:hover:bg-indigo-500 transition-colors shadow-xs">
            <span>Explore Plans</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {/* Subscription Card */}
          <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-base font-bold text-gray-900 dark:text-white">{sub.plan.name} Plan</span>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize border ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
              }`}>
                {sub.status.toLowerCase()}
              </span>
            </div>

            <div className="mt-3 text-xs text-gray-500 dark:text-slate-400 space-y-1">
              <p>
                Paid via {sub.provider} {sub.expiresAt ? `• Renews / Expires: ${new Date(sub.expiresAt).toLocaleDateString()}` : ''}
              </p>
              {isCancelled && sub.cancelledAt && (
                <p className="text-amber-600 dark:text-amber-400 font-medium">
                  Subscription cancelled on {new Date(sub.cancelledAt).toLocaleDateString()}.
                </p>
              )}
            </div>

            {/* Actions Row */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <a
                href="/pricing"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors inline-flex items-center gap-1"
              >
                <span>{isActive ? 'Change or upgrade plan' : 'Reactivate subscription (from $1)'}</span>
                <span>→</span>
              </a>

              {isActive && (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 px-3.5 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
                >
                  Cancel Plan Anytime
                </button>
              )}
            </div>
          </div>

          {/* Invoices List */}
          {sub.invoices && sub.invoices.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Invoices &amp; Receipts</h3>
              <div className="mt-3 space-y-2">
                {sub.invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-slate-200">${inv.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</p>
                    </div>
                    {inv.status === 'PAID' ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Paid</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500 dark:text-red-400">
                        <XCircle className="h-4 w-4" />
                        <span>{inv.status}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
                  Cancel Subscription?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You can cancel anytime with no penalties.
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Upon cancellation, your subscription will not renew, and future automatic charges will be stopped immediately. You can resubscribe anytime starting at just $1.
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
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Keep My Plan
              </button>

              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancelSubscription}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.99] shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Plan</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
