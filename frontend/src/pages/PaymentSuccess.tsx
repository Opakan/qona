import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import apiClient from '../api/client';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const provider = searchParams.get('provider');
  const plan = searchParams.get('plan');

  useEffect(() => {
    const verify = async () => {
      try {
        const ref = searchParams.get('reference') || searchParams.get('tx_ref');
        if (ref) {
          await apiClient.get(`/payments/verify?reference=${ref}&provider=${provider}`);
        }
        setStatus('success');
      } catch {
        setStatus('error');
      }
    };
    verify();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="max-w-md text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-gray-400" />
            <h1 className="mt-6 text-xl font-medium text-gray-900">Verifying your payment...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
            <h1 className="mt-6 text-xl font-medium text-gray-900">Payment successful!</h1>
            <p className="mt-2 text-sm text-gray-500">
              Your {plan === 'starter' ? 'Starter' : 'Pro'} plan is now active.
            </p>
            <Link to="/dashboard" className="mt-8 inline-flex rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white">
              Go to dashboard
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <h1 className="mt-6 text-xl font-medium text-gray-900">Verification failed</h1>
            <p className="mt-2 text-sm text-gray-500">Contact support if you were charged.</p>
            <Link to="/pricing" className="mt-8 inline-flex rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white">
              Back to pricing
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
