import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '0',
    period: '',
    features: ['3 workflow exports', 'Basic AI generation', 'n8n format', 'Community support'],
    cta: 'Get started',
    dark: false,
  },
  {
    name: 'Starter',
    price: '30',
    period: '/mo',
    features: ['50 workflow exports', 'Advanced AI generation', 'All platform exports', 'Version history', 'Priority support'],
    cta: 'Start free trial',
    dark: true,
  },
  {
    name: 'Pro',
    price: '99',
    period: '/mo',
    features: ['200 workflow exports', 'Custom AI training', 'All platform exports', 'Unlimited versions', 'API access', 'Dedicated support'],
    cta: 'Start free trial',
    dark: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 lg:px-6 lg:py-24">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Simple pricing</h1>
        <p className="mt-3 text-base text-gray-500">Start free. Upgrade when you need more.</p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {plans.map((plan, i) => (
          <div
            key={i}
            className={`rounded-xl border p-8 ${
              plan.dark ? 'border-gray-900 bg-gray-900' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`text-sm ${plan.dark ? 'text-gray-400' : 'text-gray-500'}`}>{plan.name}</div>
            <div className="mt-2 flex items-baseline gap-0.5">
              <span className={`text-4xl font-semibold tracking-tight ${plan.dark ? 'text-white' : 'text-black'}`}>${plan.price}</span>
              <span className="text-sm text-gray-400">{plan.period}</span>
            </div>
            <ul className="mt-6 space-y-2.5">
              {plan.features.map((f, j) => (
                <li key={j} className="flex items-center gap-2 text-sm text-gray-500">
                  <Check className={`h-3.5 w-3.5 flex-shrink-0 ${plan.dark ? 'text-gray-300' : 'text-gray-400'}`} />
                  <span className={plan.dark ? 'text-gray-300' : ''}>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/sign-in"
              className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-medium transition-colors ${
                plan.dark ? 'bg-white text-black hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
