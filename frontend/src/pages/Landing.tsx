import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import HeroCanvas from '../components/landing/HeroCanvas';
import {
  Zap,
  Layers,
  Unlock,
  Clock,
  FileJson,
  BarChart3,
  Check,
  ArrowRight,
  Github,
  Twitter,
  Mail,
  Menu,
  X,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'AI-Powered Workflow Generation',
    description: 'Build workflows from simple prompts — no manual setup. Just describe what you need and Qona creates it.',
  },
  {
    icon: Layers,
    title: 'Multi-Platform Integration',
    description: 'Export to Make.com, Zapier, or n8n with full flexibility. One workflow, any platform.',
  },
  {
    icon: Unlock,
    title: 'No Vendor Lock-In',
    description: 'Own your workflows and move between platforms freely. Your automations belong to you.',
  },
  {
    icon: Clock,
    title: 'Faster Execution',
    description: 'Save up to 80% of setup time. Go from idea to working workflow in minutes, not hours.',
  },
  {
    icon: FileJson,
    title: 'Export with Guides',
    description: 'Export workflows in JSON with clear installation instructions for every platform.',
  },
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    description: 'Track workflow performance, execution time, and success rates with built-in analytics.',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'Start building workflows for free.',
    features: ['3 Workflow Exports', 'Basic AI generation', 'n8n export', 'Community support'],
    cta: 'Get Started for Free',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '$30',
    period: '/month',
    description: 'For professionals and small teams.',
    features: [
      '50 Workflow Exports',
      'Advanced AI generation',
      'All platform exports',
      'Version history',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/month',
    description: 'For growing businesses and agencies.',
    features: [
      '200 Workflow Exports',
      'Custom AI training',
      'All platform exports',
      'Unlimited version history',
      'API access',
      'Dedicated support',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-violet-500/30">
      {/* Nav */}
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? 'border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-xl' : ''
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">Q</div>
            <span>Qona</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
            <a href="#about" className="transition-colors hover:text-white">
              About
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/sign-in"
              className="rounded-lg px-4 py-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              to="/sign-in"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-white/90"
            >
              Join the Beta
            </Link>
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#0A0A0A] px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-sm text-white/60">
              <a href="#features" className="py-2">Features</a>
              <a href="#pricing" className="py-2">Pricing</a>
              <a href="#about" className="py-2">About</a>
              <Link to="/sign-in" className="py-2 text-white">Sign in</Link>
              <Link to="/sign-in" className="rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-black">
                Join the Beta
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#2e1065_0%,_transparent_70%)] opacity-30" />
        <HeroCanvas />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-32 text-center lg:px-8">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60 backdrop-blur-sm">
            <span className="flex h-1.5 w-1.5 rounded-full bg-violet-400" />
            AI-Powered Automation Assistant
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            AI-Powered Workflow Automation
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Built from Your Prompt
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50 sm:text-xl">
            Qona turns your simple text prompts into ready-to-use workflows for Make.com, Zapier, or n8n. No complexity, no coding, just results.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/sign-in"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-black transition-all hover:bg-white/90 hover:shadow-[0_0_40px_-8px_rgba(124,58,237,0.5)]"
            >
              Join the Beta
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-medium text-white/80 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
            >
              View Demo
            </a>
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section id="about" className="relative border-t border-white/5 px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Automation is Complex
                <br />
                <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Qona Makes It Simple
                </span>
              </h2>
              <div className="mt-8 space-y-4">
                {[
                  'Too technical for most business owners — you need to learn complex tools',
                  'Time-consuming manual setup — hours of dragging and connecting nodes',
                  'Locked into single platforms — switching costs time and money',
                ].map((problem, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                      <X className="h-3 w-3 text-red-400" />
                    </div>
                    <p className="text-white/50">{problem}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-sm">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
                The Solution
              </div>
              <p className="text-lg leading-relaxed text-white/70">
                Qona uses AI to generate workflows instantly from your plain English prompts. No coding, no complexity, and no vendor lock-in. Just describe what you need — Qona builds the automation, and you export it to whatever platform you choose.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/5 px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/50">
              Features
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to Automate
            </h2>
            <p className="mt-4 text-lg text-white/40">
              Powerful tools to build, export, and manage workflows faster than ever.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className="group rounded-2xl border border-white/5 bg-white/[0.01] p-6 transition-all hover:border-white/10 hover:bg-white/[0.03]"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 ring-1 ring-violet-500/20">
                    <Icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <h3 className="text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/40">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Market Opportunity */}
      <section className="border-t border-white/5 px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/5 to-purple-500/5 p-8 text-center backdrop-blur-sm sm:p-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              A Growing Market — Millions Need Smarter Automation
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-white/40">
              With over <span className="font-semibold text-white/70">32 million small businesses</span> in the US alone and an automation market valued at{' '}
              <span className="font-semibold text-white/70">$18 billion</span>, Qona targets businesses seeking simpler, AI-driven automation solutions that work across any platform.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                { value: '32M+', label: 'Small Businesses in the US' },
                { value: '$18B', label: 'Automation Market Value' },
                { value: '80%', label: 'Time Saved on Setup' },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="mt-1 text-sm text-white/40">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-white/5 px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/50">
              Pricing
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-white/40">
              Start free. Upgrade when you need more.
            </p>
          </div>
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-8 transition-all ${
                  plan.highlighted
                    ? 'border-violet-500/30 bg-violet-500/[0.02] ring-1 ring-violet-500/20'
                    : 'border-white/5 bg-white/[0.01] hover:border-white/10'
                }`}
              >
                <div className="text-sm font-medium text-white/50">{plan.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span className="text-sm text-white/40">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-white/40">{plan.description}</p>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-white/60">
                      <Check className="h-4 w-4 flex-shrink-0 text-violet-400" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/sign-in"
                  className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-medium transition-all ${
                    plan.highlighted
                      ? 'bg-white text-black hover:bg-white/90'
                      : 'border border-white/10 text-white/80 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 px-4 py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Let&apos;s Automate the Future,{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Together
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/40">
            Join the beta and be among the first to experience AI-powered workflow automation. Your feedback shapes the product.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/sign-in"
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-black transition-all hover:bg-white/90 hover:shadow-[0_0_40px_-8px_rgba(124,58,237,0.5)]"
            >
              Join the Beta
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="mailto:hello@qona.ai"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-medium text-white/80 backdrop-blur-sm transition-all hover:border-white/20"
            >
              <Mail className="h-4 w-4" />
              hello@qona.ai
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
            <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">Q</div>
              <span>Qona</span>
            </div>
            <div className="flex gap-6 text-sm text-white/40">
              <a href="#" className="transition-colors hover:text-white/70">About Us</a>
              <a href="#" className="transition-colors hover:text-white/70">Blog</a>
              <a href="#" className="transition-colors hover:text-white/70">Terms</a>
              <a href="#" className="transition-colors hover:text-white/70">Privacy</a>
            </div>
            <div className="flex gap-4">
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-colors hover:border-white/20 hover:text-white/70">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-colors hover:border-white/20 hover:text-white/70">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/40 transition-colors hover:border-white/20 hover:text-white/70">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="mt-8 border-t border-white/5 pt-8 text-center text-sm text-white/20">
            &copy; {new Date().getFullYear()} Qona. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
