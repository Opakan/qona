import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import apiClient from '../api/client';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const provider = searchParams.get('provider') || 'flutterwave';
  const planSlug = searchParams.get('plan') || 'pro';

  const planDisplayName =
    planSlug === 'starter' ? 'Starter' : planSlug === 'enterprise' ? 'Enterprise' : 'Pro';

  useEffect(() => {
    const verify = async () => {
      try {
        const ref = searchParams.get('tx_ref') || searchParams.get('reference');
        const transactionId = searchParams.get('transaction_id') || searchParams.get('transactionId');
        const paymentStatus = searchParams.get('status');

        if (paymentStatus === 'cancelled' || paymentStatus === 'failed') {
          setStatus('error');
          return;
        }

        const queryParams = new URLSearchParams();
        if (ref) queryParams.set('reference', ref);
        if (transactionId) queryParams.set('transaction_id', transactionId);
        if (provider) queryParams.set('provider', provider);

        await apiClient.get(`/payments/verify?${queryParams.toString()}`);
        setStatus('success');
      } catch {
        setStatus('error');
      }
    };
    verify();
  }, [searchParams, provider]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-gray-400" />
            <h1 className="mt-6 text-xl font-medium text-gray-900">Verifying your payment...</h1>
            <p className="mt-2 text-sm text-gray-500">Please wait while we confirm your subscription.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
            <h1 className="mt-6 text-xl font-medium text-gray-900">Payment successful!</h1>
            <p className="mt-2 text-sm text-gray-500">
              Your <span className="font-semibold text-gray-800">{planDisplayName}</span> plan is now active.
            </p>
            <Link to="/dashboard" className="mt-8 inline-flex rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
              Go to dashboard
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-6 text-xl font-medium text-gray-900">Verification failed</h1>
            <p className="mt-2 text-sm text-gray-500">If your payment went through, please contact support and we will activate your account.</p>
            <Link to="/pricing" className="mt-8 inline-flex rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
              Back to pricing
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
