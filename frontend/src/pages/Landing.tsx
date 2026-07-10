import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Workflow, Zap, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const suggestions = [
  'Send a welcome email when a new user signs up',
  'Save Gmail attachments to Google Drive',
  'Post Slack messages when RSS feed updates',
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
    <div className="relative min-h-[calc(100vh-4rem)] bg-white flex flex-col justify-center">
      <div className="mx-auto max-w-5xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold leading-5 text-slate-650 mb-8 select-none">
            <Sparkles className="h-3.5 w-3.5 text-slate-500" />
            <span>AI-Powered Workflow Generation</span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-6xl max-w-3xl mx-auto leading-[1.1] sm:leading-[1.1]">
            Build your automations with conversational AI
          </h1>
          
          <p className="mt-6 text-base sm:text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Describe what you want to automate in plain English. Qona translates your ideas into fully compiled, ready-to-run n8n workflows.
          </p>

          {/* Interactive prompt area */}
          <div className="mt-12 mx-auto max-w-xl">
            <form onSubmit={handleSubmit} className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition-all focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a welcome email when a new user signs up..."
                rows={1}
                className="w-full resize-none border-0 bg-transparent px-4 py-3 text-slate-900 placeholder-slate-400 focus:ring-0 sm:text-sm outline-none min-h-[52px]"
              />
              <div className="flex items-center justify-between border-t border-slate-100 px-3 pt-2.5 pb-1">
                <span className="text-[10px] text-slate-400">Shift + Enter for new line</span>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 cursor-pointer"
                >
                  Create Workflow
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            <div className="mt-8">
              <p className="mb-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Try an example</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-350 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature section */}
        <div className="mx-auto mt-24 max-w-5xl sm:mt-32">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 border-t border-slate-100 pt-16">
            <div className="space-y-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-900 border border-slate-200/50">
                <Zap className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Conversational Setup</h3>
              <p className="text-xs leading-relaxed text-slate-500">No complex configuration. Simply answer dynamic clarifying questions customized to your goal.</p>
            </div>
            <div className="space-y-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-900 border border-slate-200/50">
                <Workflow className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">n8n Compilation</h3>
              <p className="text-xs leading-relaxed text-slate-500">Under the hood, Qona builds valid n8n nodes, connects variables, and validates structure.</p>
            </div>
            <div className="space-y-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-900 border border-slate-200/50">
                <Shield className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Secure Export</h3>
              <p className="text-xs leading-relaxed text-slate-500">Download the JSON file and import it directly into your own self-hosted or cloud n8n instances.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
