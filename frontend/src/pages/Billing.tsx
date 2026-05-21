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
        <CreditCard className="h-5 w-5 text-gray-400" />
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Billing</h1>
      </div>

      {loading ? (
        <Loader2 className="mt-8 h-5 w-5 animate-spin text-gray-400" />
      ) : !sub ? (
        <div className="mt-8 rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No active subscription. You are on the Free plan.</p>
          <a href="/pricing" className="mt-4 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm text-white">See plans</a>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${sub.status === 'ACTIVE' ? 'bg-green-400' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium text-gray-900">{sub.plan.name}</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              via {sub.provider}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase">Invoices</h3>
            <div className="mt-3 space-y-2">
              {sub.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                  <div>
                    <p className="text-sm text-gray-700">₦{inv.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
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
