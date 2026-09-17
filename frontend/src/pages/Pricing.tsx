import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Star, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import NumberFlow from '@number-flow/react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
}

const plans = [
  {
    name: 'Starter',
    price: 1,
    yearlyPrice: 1,
    period: 'mo',
    slug: 'starter',
    description: 'Start building workflows with essential tools.',
    features: ['10 workflow exports', 'Standard AI generation', 'n8n format export', 'Community support'],
    isPopular: false,
    buttonText: 'Get Starter ($1)',
  },
  {
    name: 'Pro',
    price: 30,
    yearlyPrice: 24, // 20% off ($288/yr)
    period: 'mo',
    slug: 'pro',
    description: 'For professionals and growing teams.',
    features: ['100 workflow exports', 'Advanced Bedrock Claude AI', 'All platform exports', 'Version history', 'Priority email support'],
    isPopular: true,
    buttonText: 'Subscribe to Pro',
  },
  {
    name: 'Enterprise',
    price: 99,
    yearlyPrice: 79, // 20% off ($948/yr)
    period: 'mo',
    slug: 'enterprise',
    description: 'For growing businesses, agencies, and teams.',
    features: ['Unlimited workflow exports', 'Custom AI fine-tuning', 'All platform exports', 'Unlimited versions', 'API access & webhooks', 'Dedicated 24/7 support'],
    isPopular: false,
    buttonText: 'Subscribe to Enterprise',
  },
];

export default function PricingPage() {
  const { isAuthenticated, subscription, hasActiveSubscription } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState<string | null>(null);
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const switchRef = useRef<HTMLButtonElement>(null);

  const requireSub = Boolean((location.state as any)?.requireSub);
  const currentPlanSlug = subscription?.plan?.slug;

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: [
          '#4f46e5', // indigo-600
          '#6366f1', // indigo-500
          '#a5b4fc', // indigo-300
          '#f8fafc', // slate-50
        ],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ['circle'],
      });
    }
  };

  const handleCheckout = async (planSlug: string) => {
    if (!isAuthenticated) { navigate('/sign-in'); return; }

    setLoading(planSlug);

    try {
      const { data } = await apiClient.post('/payments/initialize', {
        plan: planSlug,
        billingInterval: isMonthly ? 'month' : 'year',
      });
      if (data?.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } catch (err: any) {
      console.error('[Checkout Error Details]:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Payment initialization failed. Please check your network and try again.';
      alert(msg);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 lg:px-6 lg:py-24">
      {requireSub && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 rounded-2xl border border-indigo-200 bg-indigo-50/90 p-4 text-center sm:text-left flex flex-col sm:flex-row items-center gap-3 shadow-sm"
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-950">Active Plan Required</h3>
            <p className="text-xs text-indigo-700">
              To start creating automated workflows with Claude AI, please select any plan below (starting at just $1).
            </p>
          </div>
        </motion.div>
      )}

      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Simple, Transparent Pricing
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          Choose any plan to unlock AI workflow automation. Upgrade or change plans anytime.
        </p>
      </div>

      <div className="flex justify-center mb-16">
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <button
            type="button"
            ref={switchRef}
            onClick={() => handleToggle(isMonthly)}
            className={`relative inline-flex h-6.5 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
              !isMonthly ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                !isMonthly ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="ml-3 font-semibold text-slate-700 text-sm">
            Annual billing <span className="text-indigo-600 font-bold">(Save 20%)</span>
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan, index) => {
          const isPlanPopular = plan.isPopular;
          return (
            <motion.div
              key={index}
              initial={{ y: 30, opacity: 0 }}
              whileInView={
                isDesktop
                  ? {
                      y: isPlanPopular ? -12 : 0,
                      opacity: 1,
                      scale: isPlanPopular ? 1.03 : 0.97,
                    }
                  : { y: 0, opacity: 1 }
              }
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                type: 'spring',
                stiffness: 120,
                damping: 20,
              }}
              className={`rounded-2xl border p-8 flex flex-col justify-between relative transition-shadow ${
                isPlanPopular
                  ? 'border-indigo-600 bg-slate-950 text-white shadow-xl shadow-indigo-950/20'
                  : 'border-slate-200 bg-white text-slate-900 shadow-sm hover:shadow-md'
              }`}
            >
              {isPlanPopular && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] py-1 px-3 rounded-bl-xl rounded-tr-xl flex items-center gap-1 font-semibold tracking-wider uppercase">
                  <Star className="h-3 w-3 fill-current text-indigo-200" />
                  Recommended
                </div>
              )}

              <div>
                <p className={`text-base font-semibold ${isPlanPopular ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {plan.name}
                </p>
                <p className={`mt-2 text-xs leading-relaxed ${isPlanPopular ? 'text-slate-400' : 'text-slate-400'}`}>
                  {plan.description}
                </p>

                <div className="mt-6 flex items-baseline gap-1 justify-center">
                  <span className={`text-5xl font-extrabold tracking-tight ${isPlanPopular ? 'text-white' : 'text-slate-900'}`}>
                    <NumberFlow
                      value={isMonthly ? plan.price : plan.yearlyPrice}
                      format={{
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }}
                      transformTiming={{
                        duration: 400,
                        easing: 'ease-out',
                      }}
                    />
                  </span>
                  {plan.slug !== 'free' && (
                    <span className={`text-sm font-medium ${isPlanPopular ? 'text-slate-400' : 'text-slate-400'}`}>
                      /mo
                    </span>
                  )}
                </div>
                
                <p className={`text-[10px] mt-1.5 ${isPlanPopular ? 'text-slate-500' : 'text-slate-400'}`}>
                  {plan.slug === 'free' ? 'always free' : (isMonthly ? 'billed monthly' : 'billed annually')}
                </p>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-sm">
                      <Check className={`h-4.5 w-4.5 mt-0.5 flex-shrink-0 ${isPlanPopular ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      <span className={`text-left ${isPlanPopular ? 'text-slate-300' : 'text-slate-600'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <hr className={`w-full my-6 ${isPlanPopular ? 'border-slate-800' : 'border-slate-100'}`} />

                <button
                  onClick={() => handleCheckout(plan.slug)}
                  disabled={loading === plan.slug}
                  className={`w-full py-3.5 px-4 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                    currentPlanSlug === plan.slug
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : isPlanPopular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/20'
                      : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.slug ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : currentPlanSlug === plan.slug ? (
                    'Current Plan (Renew)'
                  ) : (
                    plan.buttonText
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
