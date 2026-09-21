import React, { useState, useEffect } from 'react';
import { Sparkles, LayoutGrid, Download, X, ArrowRight, ArrowLeft, CheckCircle2, Bot, Layers, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFinish = () => {
    try {
      localStorage.setItem('qonace_onboarding_seen', 'true');
    } catch { /* ignore */ }
    onClose();
  };

  const handleStartBuilding = () => {
    handleFinish();
    navigate('/chat');
  };

  const slides = [
    {
      title: 'Conversational Workflow Architect',
      tag: 'AI-Native Automation',
      description: 'Describe any complex automation in plain English. Qonace designs the nodes, parameters, error handling, and connections autonomously.',
      icon: <Bot className="h-8 w-8 text-indigo-600" />,
      bullets: [
        'Over 200+ built-in service connectors: Slack, Stripe, Gmail, PostgreSQL, and more',
        'Intelligent multi-step reasoning powered by Claude 3.5 Sonnet and DeepSeek',
        'Automatic credential isolation: zero sensitive API keys stored on server',
      ],
      preview: (
        <div className="rounded-2xl border border-slate-200/90 bg-slate-900 p-4 text-left font-mono text-xs text-slate-200 shadow-inner">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-[10px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="ml-2">Qonace AI Prompt</span>
          </div>
          <p className="mt-3 text-emerald-400">user: "When a Stripe charge &gt; $500 succeeds, post a celebration to #sales and create an invoice in Google Drive."</p>
          <p className="mt-2 text-indigo-300">qonace: "Generating 4-node execution graph [Stripe Webhook ➔ Condition ➔ Slack Post ➔ Drive Upload]..."</p>
        </div>
      ),
    },
    {
      title: 'Interactive 3-Pane Workspace',
      tag: 'Full Canvas Control',
      description: 'Experience a seamless desktop-grade interface tailored for high-density workflow creation and real-time visualization.',
      icon: <LayoutGrid className="h-8 w-8 text-indigo-600" />,
      bullets: [
        'Left Sidebar: Fast access to your conversation history and project archives',
        'Center Workspace: Dynamic prompt editor with streaming AI responses',
        'Right Visualizer: Live rendered node graph with drag-to-resize dividers and 100% full-screen canvas expansion',
      ],
      preview: (
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-100/80 rounded-2xl border border-slate-200/80 text-center text-[10px] font-bold">
          <div className="p-3 bg-white rounded-xl border border-slate-250 shadow-2xs text-slate-600">
            <span className="block text-indigo-600 font-extrabold mb-1">Pane 1</span>
            History &amp; Drafts
          </div>
          <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-2xs text-indigo-900 ring-2 ring-indigo-500/20">
            <span className="block text-indigo-600 font-extrabold mb-1">Pane 2</span>
            Chat &amp; Refinement
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-250 shadow-2xs text-slate-600">
            <span className="block text-indigo-600 font-extrabold mb-1">Pane 3</span>
            Interactive Graph
          </div>
        </div>
      ),
    },
    {
      title: '1-Click Production n8n Export',
      tag: 'Zero Vendor Lock-in',
      description: 'Your workflows belong to you. Download official n8n-compatible JSON files or copy the graph directly into any self-hosted or cloud n8n runner.',
      icon: <Download className="h-8 w-8 text-indigo-600" />,
      bullets: [
        'Direct download: Export full workflows as formatted .json with one click',
        'Native n8n schema: Drop-in compatibility with official n8n v1.0+ nodes and edges',
        'Pre-built Templates Gallery: 12 ready-to-run workflows for marketing, sales, devops, and CRM',
      ],
      preview: (
        <div className="flex items-center justify-between p-4 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl text-emerald-950">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
              JSON
            </div>
            <div className="text-left">
              <p className="text-xs font-black font-display">workflow-export.json</p>
              <p className="text-[11px] text-emerald-700 font-medium">Valid n8n v1.0+ Architecture</p>
            </div>
          </div>
          <span className="rounded-lg bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 shadow-2xs">
            Ready to Deploy
          </span>
        </div>
      ),
    },
  ];

  const currentSlide = slides[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl shadow-slate-900/30 overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Qonace" className="h-5 w-5 object-contain" />
            <span className="text-xs font-black font-display tracking-tight text-slate-900">
              Welcome to Qonace
            </span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-150">
              Quick Guide ({step + 1} of 3)
            </span>
          </div>

          <button
            onClick={handleFinish}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Slide Content */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-xs">
              {currentSlide.icon}
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded-md border border-indigo-150">
                {currentSlide.tag}
              </span>
              <h3 className="mt-1.5 text-xl font-black font-display text-slate-950 tracking-tight">
                {currentSlide.title}
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
                {currentSlide.description}
              </p>
            </div>
          </div>

          {/* Graphic / Preview */}
          {currentSlide.preview}

          {/* Key Points */}
          <div className="space-y-2 pt-1">
            {currentSlide.bullets.map((bullet, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-t border-slate-150">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === step ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-150 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            )}

            {step < slides.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleStartBuilding}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
                <span>Start Building Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
