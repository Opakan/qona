import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Workflow, Brain, ArrowUp, Download, Layers, History, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const suggestions = [
  'Design a database schema',
  'Send welcome email on signup',
  'Sync Google Calendar with Slack',
  'Save email attachments to Drive',
];

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState('');

  // Redirection for already signed in users
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text) return;

    // Save prompt to sessionStorage and redirect to sign-in
    sessionStorage.setItem('qona_pending_prompt', text);
    navigate('/sign-in');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // If loading or authenticated, render a minimal clean loading layout to avoid flicker
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-white">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="relative isolate overflow-hidden bg-white">
      {/* ChatGPT-style Hero Section */}
      <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl leading-[1.1] max-w-2xl mx-auto">
            Build AI Automations Through Conversation
          </h1>

          {/* Interactive OpenAI-style prompt area */}
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSubmit} className="relative rounded-3xl border border-slate-200 bg-white p-3 shadow-md focus-within:border-slate-350 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Design a database schema"
                rows={2}
                className="w-full resize-none border-0 bg-transparent pr-12 pl-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-0 sm:text-base outline-none min-h-[64px]"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="absolute bottom-3.5 right-3.5 flex h-8.5 w-8.5 items-center justify-center rounded-full bg-slate-955 text-white transition-all hover:bg-slate-800 disabled:opacity-10 cursor-pointer border-0"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>

            {/* Pill chips below input */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-600 transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Product Features Section (2x3 grid) */}
      <div className="mx-auto max-w-5xl px-6 pb-28">
        <div className="border-t border-slate-100 pt-16 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16">
          {/* Feature 1: Workflow Generation */}
          <div className="space-y-4 text-left">
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
              <img 
                src="/assets/workflow_generation_preview.png" 
                alt="Workflow Generation Preview" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                <Workflow className="h-3.5 w-3.5 text-slate-800" />
                Workflow Generation
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Workflow Generation</h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Qonace empowers your operations by transforming ideas into fully operational, tested workflow configurations.
              </p>
            </div>
          </div>

          {/* Feature 2: Deep Reasoning */}
          <div className="space-y-4 text-left">
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
              <img 
                src="/assets/deep_reasoning_professional.png" 
                alt="Deep Reasoning Preview" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                <Brain className="h-3.5 w-3.5 text-slate-800" />
                Deep Reasoning
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Deep Reasoning</h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Qonace is an intelligent agent system that plans and verifies every connection parameter before compiling standard JSON.
              </p>
            </div>
          </div>

          {/* Feature 3: One-click n8n Export */}
          <div className="space-y-4 text-left">
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
              <img 
                src="/assets/n8n_export_preview.png" 
                alt="One-click n8n Export Preview" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                <Download className="h-3.5 w-3.5 text-slate-800" />
                One-click n8n Export
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">One-click n8n Export</h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Instantly download compiled workflow configurations and import them directly into self-hosted or cloud n8n instances.
              </p>
            </div>
          </div>

          {/* Feature 4: Future Multi-platform Support */}
          <div className="space-y-4 text-left">
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
              <img 
                src="/assets/multi_platform_preview.png" 
                alt="Future Multi-platform Support Preview" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                <Layers className="h-3.5 w-3.5 text-slate-800" />
                Future Multi-platform Support
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Future Multi-platform Support</h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Architected to soon support native deployments for Make.com, Zapier integration recipes, and custom webhooks.
              </p>
            </div>
          </div>

          {/* Feature 5: Conversation Memory */}
          <div className="space-y-4 text-left">
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
              <img 
                src="/assets/conversation_memory_preview.png" 
                alt="Conversation Memory Preview" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                <History className="h-3.5 w-3.5 text-slate-800" />
                Conversation Memory
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Conversation Memory</h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Retain variables, labels, and parameters from past prompts to incrementally build and extend your integrations.
              </p>
            </div>
          </div>

          {/* Feature 6: Secure Local Execution */}
          <div className="space-y-4 text-left">
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white aspect-[16/10] flex items-center justify-center relative group">
              <img 
                src="/assets/secure_execution_preview.png" 
                alt="Secure Local Execution Preview" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur border border-slate-200/50 rounded-full px-3.5 py-1 text-[10px] font-bold text-slate-900 flex items-center gap-1.5 shadow-sm">
                <Shield className="h-3.5 w-3.5 text-slate-800" />
                Secure Local Execution
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Secure Local Execution</h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Export and run Qonace-generated JSON workflows locally on your own infrastructure without vendor lock-in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
