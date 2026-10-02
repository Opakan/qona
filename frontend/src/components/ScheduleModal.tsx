import React, { useState, useEffect } from 'react';
import {
  Clock, X, Play, CheckCircle2, AlertCircle, Calendar,
  Globe, Zap, Loader2, History, Trash2, Check, ChevronRight
} from 'lucide-react';
import apiClient from '../api/client';
import {
  CRON_PRESETS, TIMEZONES, isValidCron, cronToHuman, formatNextRunDate,
} from '../utils/cron-helpers';

interface ExecutionLog {
  id: string;
  executedAt: string;
  status: 'SUCCESS' | 'FAILED';
  durationMs: number;
  triggerType: 'CRON_SCHEDULE' | 'MANUAL_TEST';
  message: string;
  nodesExecuted?: number;
}

interface WorkflowSchedule {
  enabled: boolean;
  cron: string;
  humanReadable: string;
  timezone: string;
  lastRunAt?: string;
  lastRunStatus?: 'SUCCESS' | 'FAILED';
  nextRunAt?: string;
  createdAt: string;
  updatedAt: string;
  executionLogs: ExecutionLog[];
}

interface ScheduleModalProps {
  workflowId: string;
  workflowName: string;
  isOpen: boolean;
  onClose: () => void;
  onScheduleUpdated?: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  workflowId,
  workflowName,
  isOpen,
  onClose,
  onScheduleUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningTest, setRunningTest] = useState(false);
  const [schedule, setSchedule] = useState<WorkflowSchedule | null>(null);

  // Form states
  const [enabled, setEnabled] = useState(true);
  const [cron, setCron] = useState('0 9 * * 1');
  const [timezone, setTimezone] = useState('UTC');
  const [isCustomCron, setIsCustomCron] = useState(false);

  // Feedback states
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'history'>('config');

  useEffect(() => {
    if (!isOpen || !workflowId) return;

    let cancelled = false;
    const fetchSchedule = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const res = await apiClient.get(`/workflows/${workflowId}/schedule`);
        if (!cancelled && res.data?.schedule) {
          const s: WorkflowSchedule = res.data.schedule;
          setSchedule(s);
          setEnabled(s.enabled);
          setCron(s.cron);
          setTimezone(s.timezone || 'UTC');

          const isPreset = CRON_PRESETS.some((p) => p.cron === s.cron);
          setIsCustomCron(!isPreset);
        } else if (!cancelled) {
          // Defaults if no schedule yet
          setEnabled(true);
          setCron('0 9 * * 1');
          setTimezone('UTC');
          setIsCustomCron(false);
          setSchedule(null);
        }
      } catch {
        // Fallback default
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSchedule();
    return () => { cancelled = true; };
  }, [isOpen, workflowId]);

  if (!isOpen) return null;

  const valid = isValidCron(cron);
  const humanTranslation = cronToHuman(cron);

  const handleSave = async () => {
    if (!valid) {
      setMessage({ text: 'Please enter a valid 5-part cron syntax.', type: 'error' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await apiClient.post(`/workflows/${workflowId}/schedule`, {
        enabled,
        cron,
        timezone,
      });

      if (res.data?.schedule) {
        setSchedule(res.data.schedule);
        setMessage({ text: res.data.message || 'Schedule updated successfully!', type: 'success' });
        if (onScheduleUpdated) onScheduleUpdated();
      }
    } catch (err: any) {
      setMessage({
        text: err?.response?.data?.error || err.message || 'Failed to save schedule.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunningTest(true);
    setMessage(null);
    try {
      const res = await apiClient.post(`/workflows/${workflowId}/schedule/run-now`);
      if (res.data?.schedule) {
        setSchedule(res.data.schedule);
        setMessage({
          text: `⚡ Test run complete: ${res.data.log?.status === 'SUCCESS' ? 'Success' : 'Failed'} (${res.data.log?.durationMs}ms)`,
          type: res.data.log?.status === 'SUCCESS' ? 'success' : 'error',
        });
        if (onScheduleUpdated) onScheduleUpdated();
      }
    } catch (err: any) {
      setMessage({
        text: err?.response?.data?.error || 'Test execution failed.',
        type: 'error',
      });
    } finally {
      setRunningTest(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!confirm('Are you sure you want to remove this schedule?')) return;
    setSaving(true);
    try {
      await apiClient.delete(`/workflows/${workflowId}/schedule`);
      setSchedule(null);
      setEnabled(false);
      setMessage({ text: 'Schedule deleted.', type: 'success' });
      if (onScheduleUpdated) onScheduleUpdated();
    } catch {
      setMessage({ text: 'Failed to delete schedule.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60 shadow-2xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black font-display text-slate-900 dark:text-white leading-tight">
                  Workflow Scheduler
                </h3>
                {schedule?.enabled ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    Paused
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">
                {workflowName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-150 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Schedule Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Execution Logs ({schedule?.executionLogs?.length || 0})</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-2xl flex items-center gap-2.5 text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span className="flex-1">{message.text}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : activeTab === 'config' ? (
            <>
              {/* Enable Toggle Card */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Enable Automated Execution
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Automatically triggers this workflow based on your cron schedule.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Schedule Presets */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Select Frequency
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {CRON_PRESETS.map((p) => {
                    const isSelected = !isCustomCron && cron === p.cron;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setCron(p.cron);
                          setIsCustomCron(false);
                        }}
                        className={`group relative flex flex-col p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500 shadow-2xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold ${
                            isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {p.label}
                          </span>
                          {p.badge && (
                            <span className="rounded-md bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 text-[9px] font-extrabold text-indigo-700 dark:text-indigo-300 uppercase">
                              {p.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {p.description}
                        </p>
                        <span className="mt-2 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          {p.cron}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Cron Toggle */}
                <button
                  type="button"
                  onClick={() => setIsCustomCron(true)}
                  className={`w-full mt-2 flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isCustomCron
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 dark:border-indigo-500'
                      : 'border-dashed border-slate-300 dark:border-slate-700 bg-transparent hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      🛠️ Custom Cron Expression
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              {/* Custom Cron Input */}
              {isCustomCron && (
                <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-900 dark:text-white">
                      5-Part Standard Cron Expression
                    </label>
                    <input
                      type="text"
                      value={cron}
                      onChange={(e) => setCron(e.target.value)}
                      placeholder="e.g. */15 * * * * or 0 9 * * 1"
                      className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-semibold">
                    {valid ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Valid format: &ldquo;{humanTranslation}&rdquo;
                      </span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Invalid cron. Required: [min] [hour] [day-of-month] [month] [day-of-week]
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Timezone Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  Execution Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 px-3 text-xs font-semibold text-slate-900 dark:text-white shadow-2xs focus:border-indigo-500 focus:outline-hidden"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Next Scheduled Execution Preview */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Next Run Prediction
                  </span>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {enabled ? formatNextRunDate(schedule?.nextRunAt) : 'Paused (Will not run)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunNow}
                  disabled={runningTest}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Execute workflow immediately and log result"
                >
                  {runningTest ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )}
                  <span>Run Test Now</span>
                </button>
              </div>
            </>
          ) : (
            /* Tab 2: Execution Logs */
            <div className="space-y-3">
              {schedule?.executionLogs && schedule.executionLogs.length > 0 ? (
                schedule.executionLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                        }`}>
                          {log.status === 'SUCCESS' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                          {log.status}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {log.triggerType === 'MANUAL_TEST' ? '⚡ Manual Test' : '⏰ Scheduled Run'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {log.durationMs}ms
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {log.message}
                    </p>

                    <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span>{new Date(log.executedAt).toLocaleString()}</span>
                      {log.nodesExecuted && <span>{log.nodesExecuted} nodes processed</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No execution history recorded yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Click &ldquo;Run Test Now&rdquo; to simulate a live execution.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-5 border-t border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
          <div>
            {schedule && (
              <button
                type="button"
                onClick={handleDeleteSchedule}
                disabled={saving}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Schedule</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !valid}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              <span>Save Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
