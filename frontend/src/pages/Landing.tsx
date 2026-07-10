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
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50/50">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="relative isolate overflow-hidden bg-slate-50/50">
      {/* Background decoration */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-200 to-indigo-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
        />
      </div>

      <div className="mx-auto max-w-5xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-semibold leading-6 text-indigo-600 shadow-sm ring-1 ring-indigo-600/10 hover:ring-indigo-600/20 transition-all mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Powered Workflow Generation</span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 bg-clip-text">
            Build your automations <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">with conversational AI</span>
          </h1>
          
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            Describe what you want to automate in plain English. Qona translates your ideas into fully compiled, ready-to-run n8n workflows.
          </p>

          {/* Interactive prompt area */}
          <div className="mt-10 mx-auto max-w-xl">
            <form onSubmit={handleSubmit} className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-100/50 transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a welcome email when a new user signs up..."
                rows={1}
                className="w-full resize-none border-0 bg-transparent px-4 py-3.5 text-slate-950 placeholder-slate-400 focus:ring-0 sm:text-sm outline-none min-h-[52px]"
              />
              <div className="flex items-center justify-between border-t border-slate-100 px-3 pt-2 pb-1">
                <span className="text-xs text-slate-400">Shift + Enter for new line</span>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 cursor-pointer"
                >
                  Create Workflow
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            <div className="mt-6">
              <p className="mb-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Try an example</p>
              <div className="flex flex-wrap gap-2.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-600 cursor-pointer"
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
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">Conversational Setup</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">No complex configuration. Simply answer dynamic clarifying questions customized to your goal.</p>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Workflow className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">n8n Compilation</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">Under the hood, Qona builds valid n8n nodes, connects variables, and validates structure.</p>
            </div>
            <div className="rounded-2xl border border-slate-200/60 bg-white/60 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">Secure Export</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">Download the JSON file and import it directly into your own self-hosted or cloud n8n instances.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
