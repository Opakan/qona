import React, { useState, useEffect } from 'react';
import {
  Wand2, X, CheckCircle2, ShieldCheck, Zap, AlertTriangle,
  ArrowRight, Loader2, Sparkles, RefreshCw, Check
} from 'lucide-react';
import apiClient from '../api/client';

interface Suggestion {
  id: string;
  category: 'ERROR_HANDLING' | 'PERFORMANCE' | 'SECURITY' | 'CLEANLINESS';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actionTaken: string;
}

interface WorkflowOptimizerModalProps {
  graph: any;
  isOpen: boolean;
  onClose: () => void;
  onApplyOptimizations?: (optimizedGraph: any) => void;
}

export const WorkflowOptimizerModal: React.FC<WorkflowOptimizerModalProps> = ({
  graph,
  isOpen,
  onClose,
  onApplyOptimizations,
}) => {
  const [analyzing, setAnalyzing] = useState(true);
  const [scoreBefore, setScoreBefore] = useState(72);
  const [scoreAfter, setScoreAfter] = useState(98);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [optimizedGraph, setOptimizedGraph] = useState<any | null>(null);
  const [applied, setApplied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runOptimizer = async () => {
    try {
      setAnalyzing(true);
      setErrorMsg(null);
      setApplied(false);
      const res = await apiClient.post('/workflows/optimize', { graph });
      setScoreBefore(res.data?.scoreBefore ?? 72);
      setScoreAfter(res.data?.scoreAfter ?? 98);
      setSuggestions(res.data?.suggestions ?? []);
      setOptimizedGraph(res.data?.optimizedGraph ?? graph);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to optimize workflow graph.');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isOpen && graph) {
      runOptimizer();
    }
  }, [isOpen, graph]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (optimizedGraph && onApplyOptimizations) {
      onApplyOptimizations(optimizedGraph);
      setApplied(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border-rose-200 dark:border-rose-900';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 border-amber-200 dark:border-amber-900';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-400 border-blue-200 dark:border-blue-900';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  AI Workflow Optimizer &amp; Self-Healing Agent
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated graph analysis for error handling, security, and pipeline latency.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-900 dark:text-slate-100">
          {analyzing ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Analyzing workflow graph structure...
                </p>
                <p className="text-xs text-slate-400">
                  Checking retry boundaries, schema validators, and API failure modes.
                </p>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
              <AlertTriangle className="h-4 w-4 inline-block mr-1.5" />
              {errorMsg}
            </div>
          ) : applied ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 text-emerald-600 dark:text-emerald-400">
              <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/80 animate-bounce">
                <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Optimizations Applied to AI Studio!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your workflow graph has been updated with auto-retry policies and health guards.
              </p>
            </div>
          ) : (
            <>
              {/* Score Improvement Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-emerald-500/10 border border-purple-200/50 dark:border-purple-800/50 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Health Score Upgrade
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-black text-slate-500 line-through">
                      {scoreBefore}%
                    </span>
                    <ArrowRight className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      {scoreAfter}%
                      <Sparkles className="h-4 w-4 fill-current text-amber-500" />
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {suggestions.length} Fixes Ready
                  </span>
                </div>
              </div>

              {/* Suggestions List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  AI Optimization Breakdown
                </h4>

                {suggestions.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getImpactColor(item.impact)}`}>
                        {item.impact} IMPACT
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {item.description}
                    </p>

                    <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/40 p-2 rounded-xl border border-purple-100 dark:border-purple-900/30">
                      <Zap className="h-3 w-3 text-purple-500 shrink-0" />
                      <span>{item.actionTaken}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!analyzing && !applied && !errorMsg && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={runOptimizer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5 text-purple-500" />
              <span>Re-analyze</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Dismiss
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>Apply Optimizations ({scoreAfter}% Health)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
