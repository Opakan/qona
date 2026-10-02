import React, { useState, useEffect } from 'react';
import {
  BarChart3, Activity, CheckCircle2, AlertTriangle, Clock, Zap,
  TrendingUp, ArrowUpRight, RefreshCw, Loader2, ShieldAlert,
  ChevronRight, Layers, Play, ExternalLink, MessageSquareText
} from 'lucide-react';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

interface AnalyticsData {
  summary: {
    totalExecutions: number;
    successCount: number;
    failedCount: number;
    successRate: number;
    avgLatencyMs: number;
    totalSchedules: number;
  };
  dailyTrend: Array<{
    date: string;
    displayDate: string;
    total: number;
    success: number;
    failed: number;
    avgLatencyMs: number;
  }>;
  topWorkflows: Array<{
    id: string;
    name: string;
    totalRuns: number;
    successRate: number;
    avgLatencyMs: number;
    lastRunStatus: 'SUCCESS' | 'FAILED';
    lastRunAt: string;
  }>;
  recentErrors: Array<{
    id: string;
    workflowName: string;
    nodeName: string;
    errorType: string;
    message: string;
    timestamp: string;
  }>;
}

export const AnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'14d' | '30d' | '90d'>('14d');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/analytics/overview');
      setData(res.data);
    } catch (err) {
      console.warn('[Analytics] Failed to fetch analytics overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-xs font-semibold">Calculating execution metrics...</p>
      </div>
    );
  }

  if (!data) return null;

  const maxDailyTotal = Math.max(...data.dailyTrend.map((d) => d.total), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Execution Analytics &amp; Health
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time execution metrics, success rates, latency distributions, and node error feeds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            {(['14d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            title="Refresh analytics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Executions */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Runs
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {data.summary.totalExecutions.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
              <TrendingUp className="h-3 w-3" /> +14.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Across all automated workflows</p>
        </div>

        {/* Success Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Success Rate
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {data.summary.successRate}%
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {data.summary.failedCount} failures
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">99.9% target SLA</p>
        </div>

        {/* Avg Latency */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Avg Latency
            </span>
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {data.summary.avgLatencyMs} ms
            </span>
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
              Fast
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Average node execution speed</p>
        </div>

        {/* Active Schedules */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Cron Schedules
            </span>
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {data.summary.totalSchedules} Active
            </span>
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
              Automated
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Running on background crons</p>
        </div>
      </div>

      {/* Daily Execution Volume Chart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Daily Execution Volume &amp; Failures</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hover over bars to inspect daily run counts and average node response time.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <span className="h-3 w-3 rounded-md bg-indigo-500 inline-block" />
              <span>Success</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="h-3 w-3 rounded-md bg-rose-500 inline-block" />
              <span>Failed</span>
            </div>
          </div>
        </div>

        {/* Bar Chart Visualization */}
        <div className="h-48 pt-6 flex items-end justify-between gap-2 border-b border-slate-100 dark:border-slate-800">
          {data.dailyTrend.map((item, idx) => {
            const heightPercent = Math.max((item.total / maxDailyTotal) * 100, 8);
            const isHovered = hoveredBarIndex === idx;

            return (
              <div
                key={item.date}
                className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                onMouseEnter={() => setHoveredBarIndex(idx)}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-2 z-20 w-44 p-3 rounded-2xl bg-slate-900 text-white text-[11px] shadow-xl border border-slate-700 animate-fade-in pointer-events-none">
                    <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-300">
                      {item.displayDate}
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Total Runs:</span>
                      <span className="font-bold text-white">{item.total}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>Successful:</span>
                      <span className="font-bold">{item.success}</span>
                    </div>
                    {item.failed > 0 && (
                      <div className="flex justify-between text-rose-400">
                        <span>Failed:</span>
                        <span className="font-bold">{item.failed}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-cyan-400 mt-1 pt-1 border-t border-slate-800">
                      <span>Avg Latency:</span>
                      <span className="font-bold">{item.avgLatencyMs}ms</span>
                    </div>
                  </div>
                )}

                {/* Vertical Bar Stack */}
                <div
                  className="w-full rounded-t-xl overflow-hidden transition-all duration-300 flex flex-col justify-end"
                  style={{ height: `${heightPercent}%` }}
                >
                  {/* Failed portion */}
                  {item.failed > 0 && (
                    <div
                      className="bg-rose-500 group-hover:bg-rose-600 transition-colors"
                      style={{ height: `${(item.failed / item.total) * 100}%` }}
                    />
                  )}
                  {/* Success portion */}
                  <div
                    className="bg-indigo-500 dark:bg-indigo-600 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 transition-colors flex-1"
                  />
                </div>

                {/* X Axis Label */}
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-2 truncate w-full text-center">
                  {item.displayDate}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column Section: Top Workflows + Recent Errors Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Top Performing Workflows */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span>Highest Execution Workflows</span>
            </h3>
            <span className="text-xs text-slate-400">Ranked by volume</span>
          </div>

          <div className="space-y-3">
            {data.topWorkflows.map((wf) => (
              <div
                key={wf.id}
                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-200 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {wf.name}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      wf.lastRunStatus === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400'
                    }`}>
                      {wf.lastRunStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{wf.totalRuns} runs</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{wf.successRate}% success</span>
                    <span>•</span>
                    <span>{wf.avgLatencyMs}ms avg</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/chat')}
                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Open in Builder"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Recent Node Error Log Stream */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-500" />
              <span>Node Failure &amp; Error Stream</span>
            </h3>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
              Live Feed
            </span>
          </div>

          <div className="space-y-3">
            {data.recentErrors.map((err) => (
              <div
                key={err.id}
                className="p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-rose-900 dark:text-rose-200 truncate">
                    {err.workflowName}
                  </span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(err.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-mono px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold">
                    {err.nodeName}
                  </span>
                  <span className="text-rose-500 font-bold">{err.errorType}</span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-white/60 dark:bg-slate-900/60 p-2 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  {err.message}
                </p>

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => navigate('/chat', { state: { initialPrompt: `Debug node error: "${err.message}" in workflow ${err.workflowName}` } })}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <MessageSquareText className="h-3 w-3" />
                    <span>Debug with AI Chat &rarr;</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
