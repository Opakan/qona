import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Workflow, Zap, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const suggestions = [
  'Send a welcome email when a new user signs up',
  'Save Gmail attachments to Google Drive',
  'Post Slack messages when RSS feed updates',
];

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirection for already signed in users
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

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
      <div className="mx-auto max-w-5xl px-6 pt-16 pb-24 sm:pt-20 sm:pb-32 lg:px-8">
        {/* HERO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Copy + Chat Preview */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold leading-5 text-slate-600 select-none">
                <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                <span>AI-Powered Workflow Generation</span>
              </div>
              
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl leading-[1.1] sm:leading-[1.1] max-w-xl">
                Build AI Automations Through Conversation
              </h1>
              
              <div className="text-base text-slate-500 max-w-md space-y-1.5 leading-relaxed font-medium">
                <p>Describe what you want.</p>
                <p>Qonace asks the right questions.</p>
                <p>Generates production-ready workflows.</p>
                <p>Export to n8n in seconds.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/sign-in')}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-all cursor-pointer"
              >
                Start Building
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <button
                onClick={() => alert('Demo video is coming soon!')}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-650 shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
              >
                Watch Demo
              </button>
            </div>

            {/* Interactive Chat Preview */}
            <div className="border border-slate-200/80 bg-slate-50/30 p-5 rounded-2xl max-w-xl space-y-4 shadow-sm select-none">
              {/* User message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex items-start gap-3"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xs font-bold font-mono">
                  U
                </div>
                <div className="flex-1 bg-white border border-slate-150 rounded-2xl px-4 py-2.5 text-xs text-slate-800 shadow-sm leading-relaxed max-w-[85%]">
                  "When I receive a Gmail attachment, save it to Google Drive."
                </div>
              </motion.div>

              {/* AI response */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.4 }}
                className="flex items-start gap-3 justify-end"
              >
                <div className="flex-1 bg-indigo-50/40 border border-indigo-100 rounded-2xl px-4 py-2.5 text-xs text-slate-800 shadow-sm leading-relaxed max-w-[85%] text-left">
                  "Which Gmail label should I monitor?"
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold font-mono">
                  Q
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right Column: Live Workflow Preview with Clean Nodes */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="border border-slate-100 bg-[#fafafa] p-8 rounded-2xl relative w-full aspect-[4/5] max-w-[340px] flex flex-col justify-between items-center shadow-inner overflow-hidden select-none">
              {/* Connecting line with animated pulse */}
              <div className="absolute top-[80px] bottom-[80px] w-0.5 bg-slate-200 border-dashed border-l">
                <motion.div
                  animate={{ y: [0, 160] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
                  className="h-2 w-2 -ml-[3px] rounded-full bg-slate-800 shadow-sm shadow-slate-900/50"
                />
              </div>

              {/* Node 1: Gmail Trigger */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm flex items-center gap-3 w-full z-10 hover:border-slate-350 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 border border-red-100">
                  <Workflow className="h-4.5 w-4.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">Gmail Trigger</p>
                  <p className="text-[10px] text-slate-450 mt-0.5">On new attachment</p>
                </div>
              </motion.div>

              {/* Node 2: Filter check */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.8 }}
                className="bg-white border border-slate-200/80 p-3 rounded-lg shadow-sm flex items-center gap-2.5 z-10"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-semibold text-slate-600">Checking label matches...</span>
              </motion.div>

              {/* Node 3: Google Drive Upload */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 2.4 }}
                className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm flex items-center gap-3 w-full z-10 hover:border-slate-350 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Workflow className="h-4.5 w-4.5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">Google Drive</p>
                  <p className="text-[10px] text-slate-450 mt-0.5">Upload file</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Feature section */}
        <div className="mx-auto mt-28 max-w-5xl">
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
