import { useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import apiClient from '../api/client';

interface SubscriptionInfo {
  id: string;
  status: string;
  provider: string;
  plan: { name: string; slug: string; [key: string]: unknown };
  invoices: Array<{ id: string; amount: number; status: string; createdAt: string }>;
  expiresAt: string;
}

export default function Billing() {
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/payments/subscription')
      .then(({ data }) => setSub(data.subscription))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6 lg:py-20">
      <div className="flex items-center gap-3">
        <CreditCard className="h-5 w-5 text-gray-400 dark:text-slate-500" />
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Billing</h1>
      </div>

      {loading ? (
        <Loader2 className="mt-8 h-5 w-5 animate-spin text-gray-400 dark:text-slate-500" />
      ) : !sub ? (
        <div className="mt-8 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 text-center shadow-xs">
          <p className="text-sm text-gray-500 dark:text-slate-400">No active subscription. Plans start at just $1/month.</p>
          <a href="/pricing" className="mt-4 inline-flex rounded-lg bg-gray-900 dark:bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-gray-800 dark:hover:bg-indigo-500 transition-colors">See plans</a>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${sub.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-700'}`} />
                <span className="text-base font-semibold text-gray-900 dark:text-white">{sub.plan.name} Plan</span>
              </div>
              <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 capitalize">
                {sub.status.toLowerCase()}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
              Paid via {sub.provider} {sub.expiresAt ? `• Renews / Expires: ${new Date(sub.expiresAt).toLocaleDateString()}` : ''}
            </p>
            <div className="mt-4">
              <a href="/pricing" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                Change or upgrade plan →
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase">Invoices</h3>
            <div className="mt-3 space-y-2">
              {sub.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-200">${inv.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                  {inv.status === 'PAID' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
