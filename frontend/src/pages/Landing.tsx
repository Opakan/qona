import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Workflow, Brain, ArrowUp, ExternalLink } from 'lucide-react';
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
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl leading-tight">
            What can I help with?
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
                className="absolute bottom-3.5 right-3.5 flex h-8.5 w-8.5 items-center justify-center rounded-full bg-slate-950 text-white transition-all hover:bg-slate-800 disabled:opacity-10 cursor-pointer border-0"
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

      {/* Product Cards (Qwen Style) */}
      <div className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Qonace Studio */}
          <div className="border border-slate-200 rounded-2xl p-6 bg-white flex flex-col justify-between h-[360px] relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="space-y-2 text-left">
              <h3 className="text-sm font-bold text-slate-900">Qonace Studio</h3>
              <p className="text-[11px] leading-relaxed text-slate-505 max-w-[220px]">
                Qonace Studio is an AI assistant for everyone, powered by the Qonace conversational workflow planner.
              </p>
            </div>
            {/* Wireframe Mockup at the bottom */}
            <div className="mt-6 border-t border-slate-100 pt-4 flex-1 flex items-end">
              <div className="w-full bg-slate-50 border border-slate-200/85 rounded-t-xl h-36 p-3 flex gap-2 overflow-hidden shadow-inner">
                <div className="w-1/3 bg-white border border-slate-200 rounded-lg h-full flex flex-col justify-between p-1.5">
                  <div className="h-1.5 w-2/3 bg-slate-200 rounded" />
                  <div className="h-1.5 w-full bg-slate-100 rounded" />
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-lg h-full p-2 flex flex-col gap-2">
                  <div className="h-2 w-1/3 bg-slate-200 rounded" />
                  <div className="flex-1 border border-dashed border-slate-200 rounded flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-slate-100 animate-ping" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: API Platform */}
          <div className="border border-slate-200 rounded-2xl p-6 bg-white flex flex-col justify-between h-[360px] relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="space-y-2 text-left">
              <h3 className="text-sm font-bold text-slate-900">API Platform</h3>
              <p className="text-[11px] leading-relaxed text-slate-550 max-w-[220px]">
                Open API which uses an API format compatible with standard OpenAPI and workflow schemas.
              </p>
            </div>
            {/* Wireframe Mockup at the bottom */}
            <div className="mt-6 border-t border-slate-100 pt-4 flex-1 flex items-end">
              <div className="w-full bg-slate-50 border border-slate-200/80 rounded-t-xl h-36 p-3 flex flex-col gap-2 overflow-hidden shadow-inner">
                <div className="flex items-center gap-1.5 border-b border-slate-250 pb-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[8px] font-mono text-slate-450">GET /v1/workflows</span>
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-lg p-2 font-mono text-[7px] text-slate-400 overflow-hidden leading-normal text-left">
                  {`{\n  "status": "success",\n  "data": {\n    "nodes": []\n  }\n}`}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Download / n8n Export */}
          <div className="border border-slate-200 rounded-2xl p-6 bg-white flex flex-col justify-between h-[360px] relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Download</h3>
                <button 
                  onClick={() => navigate('/sign-in')} 
                  className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-200 rounded-full text-[10px] font-bold text-slate-650 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Download <ExternalLink className="h-2.5 w-2.5" />
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Use Qonace workflows on your self-hosted or cloud n8n instance.
              </p>
            </div>
            {/* Actual Generated Image Mockup at the bottom */}
            <div className="mt-6 border-t border-slate-100 pt-4 flex-1 flex items-end relative overflow-hidden">
              <img 
                src="/assets/qonace_studio_preview.png" 
                alt="Qonace Studio Preview" 
                className="w-full object-cover object-top h-36 border border-slate-200 rounded-t-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Product Features Section (Qwen Style, 2 columns) */}
      <div className="mx-auto max-w-5xl px-6 pb-28">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Product Features</h2>
          <button 
            onClick={() => navigate('/sign-in')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            Explore Qonace Studio <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                src="/assets/deep_reasoning_preview.png" 
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
        </div>
      </div>
    </div>
  );
}
