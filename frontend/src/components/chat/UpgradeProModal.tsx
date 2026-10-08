import React from 'react';
import { Crown, Check, Zap, Sparkles, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeProModal: React.FC<UpgradeProModalProps> = ({ isOpen, onClose }) => {
  const { subscription } = useAuth();
  if (!isOpen) return null;

  const currentSlug = (subscription?.plan?.slug || '').toLowerCase();
  const isStarter = currentSlug === 'starter';
  const isPro = currentSlug === 'pro' || currentSlug === 'enterprise';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Decorative Background Glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-2xl pointer-events-none" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-indigo-600 text-white shadow-md">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
              <Sparkles className="h-3 w-3 text-amber-600" />
              {isStarter ? 'Current: Starter Plan ($1/mo)' : isPro ? 'Pro Workspace Active' : 'Qonace Pro Workspace'}
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              {isStarter ? 'Upgrade from Starter to Pro' : isPro ? 'You are on Pro Plan' : 'Choose Your Plan'}
            </h3>
          </div>
        </div>

        {/* Plan Features List */}
        <div className="space-y-3.5 mb-8">
          {[
            { title: '100 AI Workflow Exports per Month', desc: '10x more capacity than Starter plan.' },
            { title: 'Advanced Workflow AI Reasoning Engine', desc: 'Smarter multi-step logic, complex community nodes & LangChain agents.' },
            { title: 'Instant Execution Simulator', desc: 'Full step-by-step trace simulation with custom test payloads.' },
            { title: '1-Click Direct n8n Export & Clipboard Copy', desc: 'Instant JSON exports compatible with n8n Cloud & Self-Hosted.' },
            { title: 'Priority RAG Knowledge Retrieval', desc: 'Faster compilation with access to 14,000+ n8n workflows.' },
          ].map((feature, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mt-0.5">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{feature.title}</h4>
                <p className="text-[11px] font-medium text-slate-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Card Footer */}
        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 mb-6 flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-slate-900">
              {isStarter ? '$30' : isPro ? '$30' : '$1 / $30'}
              <span className="text-xs font-bold text-slate-500">{isStarter ? ' / month (Pro Plan)' : isPro ? ' / month (Active)' : ' Starter or Pro'}</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400">
              {isStarter ? 'Upgrade anytime. Your $1 Starter plan is currently active.' : 'Cancel or switch plans anytime'}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            Instant Activation
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {isStarter ? (
            <Link
              to="/pricing"
              onClick={onClose}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 px-5 py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all text-center flex items-center justify-center gap-1.5"
            >
              <span>Upgrade to Pro ($30/mo)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : isPro ? (
            <Link
              to="/billing"
              onClick={onClose}
              className="flex-1 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-all text-center"
            >
              Manage Pro Subscription
            </Link>
          ) : (
            <Link
              to="/pricing"
              onClick={onClose}
              className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 px-5 py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all text-center"
            >
              Choose Plan (from $1)
            </Link>
          )}
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
