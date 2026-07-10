import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Star, Loader2 } from 'lucide-react';
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
    name: 'Free',
    price: 0,
    yearlyPrice: 0,
    period: 'mo',
    slug: 'free',
    description: 'Start building workflows for free.',
    features: ['3 workflow exports', 'Basic AI generation', 'n8n format', 'Community support'],
    isPopular: false,
    buttonText: 'Get started',
  },
  {
    name: 'Starter',
    price: 29,
    yearlyPrice: 23,
    period: 'mo',
    slug: 'starter',
    description: 'For professionals and small teams.',
    features: ['50 workflow exports', 'Advanced AI generation', 'All platform exports', 'Version history', 'Priority support'],
    isPopular: true,
    buttonText: 'Subscribe',
  },
  {
    name: 'Pro',
    price: 99,
    yearlyPrice: 79,
    period: 'mo',
    slug: 'pro',
    description: 'For growing businesses and agencies.',
    features: ['200 workflow exports', 'Custom AI training', 'All platform exports', 'Unlimited versions', 'API access', 'Dedicated support'],
    isPopular: false,
    buttonText: 'Subscribe',
  },
];

export default function PricingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const switchRef = useRef<HTMLButtonElement>(null);

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
    if (planSlug === 'free') { navigate('/dashboard'); return; }

    setLoading(planSlug);

    try {
      const { data } = await apiClient.post('/payments/initialize', { plan: planSlug });
      window.location.href = data.authorizationUrl;
    } catch {
      alert('Payment initialization failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 lg:px-6 lg:py-24">
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Simple, Transparent Pricing
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          Start free. Upgrade when you need more. Pay with Flutterwave.
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
                  Popular
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
                    isPlanPopular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-600/20'
                      : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.slug ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
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
