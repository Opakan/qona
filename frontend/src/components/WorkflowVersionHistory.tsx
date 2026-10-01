import { useEffect, useState, useCallback } from 'react';
import {
  X, History, RotateCcw, ChevronRight, Clock, GitBranch,
  AlertTriangle, CheckCircle2, Loader2, Eye, Code2,
} from 'lucide-react';
import apiClient from '../api/client';

interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  changelog: string;
  definition: Record<string, unknown>;
  createdAt: string;
}

interface Props {
  workflowId: string;
  workflowName: string;
  currentVersion?: number;
  onClose: () => void;
  onRestored: () => void;
}

export function WorkflowVersionHistory({ workflowId, workflowName, onClose, onRestored }: Props) {
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<WorkflowVersion | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<WorkflowVersion | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState<'info' | 'json'>('info');

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get(`/workflows/${workflowId}/versions`);
      const vList: WorkflowVersion[] = res.data?.versions ?? [];
      setVersions(vList);
      if (vList.length > 0) setSelectedVersion(vList[0]);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load version history');
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  const handleRestore = async () => {
    if (!confirmRestore || restoring) return;
    try {
      setRestoring(true);
      await apiClient.post(`/workflows/${workflowId}/versions/${confirmRestore.version}/restore`);
      setRestoreSuccess(true);
      setTimeout(() => { onRestored(); onClose(); }, 1800);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Restore failed');
      setConfirmRestore(null);
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const nodeCount = (def: Record<string, unknown>): number => {
    const nodes = (def as any)?.nodes;
    return Array.isArray(nodes) ? nodes.length : 0;
  };

  const isCurrentVersion = (v: WorkflowVersion) => v.version === versions[0]?.version;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1018] shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center">
              <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Version History</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-xs">{workflowName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body states */}
        {restoreSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Restore Successful</p>
              <p className="text-xs text-slate-400 mt-1">Workflow rolled back to v{confirmRestore?.version}. Closing...</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="text-xs text-slate-400 font-medium">Loading version history...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{error}</p>
            <button onClick={fetchVersions} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer">Try again</button>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 text-center">
            <GitBranch className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No versions recorded yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">Versions are saved automatically each time you update or export a workflow.</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Version Timeline sidebar */}
            <div className="w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/30">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {versions.length} {versions.length === 1 ? 'version' : 'versions'}
                </span>
              </div>
              <div className="relative py-2">
                <div className="absolute left-[31px] top-4 bottom-4 w-px bg-slate-200 dark:bg-slate-800" />
                {versions.map((v) => {
                  const isCurrent = isCurrentVersion(v);
                  const isSelected = selectedVersion?.version === v.version;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVersion(v)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors relative cursor-pointer ${
                        isSelected ? 'bg-indigo-50 dark:bg-indigo-950/30' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center z-10 ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                      }`}>
                        {isCurrent && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            v{v.version}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded px-1 py-0.5 uppercase tracking-wide">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight line-clamp-2">{v.changelog}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 text-slate-300 dark:text-slate-600" />
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(v.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail panel */}
            {selectedVersion && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1018] shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900 dark:text-white">Version {selectedVersion.version}</span>
                        {isCurrentVersion(selectedVersion) && (
                          <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-md px-2 py-0.5 uppercase tracking-wide">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedVersion.changelog}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                      <button
                        onClick={() => setPreviewMode('info')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${previewMode === 'info' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'}`}
                      >
                        <Eye className="h-3 w-3" /> Info
                      </button>
                      <button
                        onClick={() => setPreviewMode('json')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${previewMode === 'json' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'}`}
                      >
                        <Code2 className="h-3 w-3" /> JSON
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {previewMode === 'info' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4">
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Saved At</div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{formatDate(selectedVersion.createdAt)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4">
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Nodes</div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{nodeCount(selectedVersion.definition)} nodes</div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Change Summary</div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{selectedVersion.changelog}</p>
                      </div>

                      {Array.isArray((selectedVersion.definition as any)?.nodes) && (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4">
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Workflow Nodes</div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {((selectedVersion.definition as any).nodes as any[]).map((node: any, i: number) => (
                              <div key={i} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <div className="h-2 w-2 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                                  {node.label || node.name || node.type || `Node ${i + 1}`}
                                </span>
                                {(node.type || node.category) && (
                                  <span className="ml-auto text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0">
                                    {node.type || node.category}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="ml-2 text-[10px] font-semibold text-slate-400">workflow-v{selectedVersion.version}.json</span>
                      </div>
                      <pre className="bg-slate-950 text-emerald-300 text-[11px] p-5 overflow-auto max-h-96 leading-relaxed font-mono">
                        {JSON.stringify(selectedVersion.definition, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Restore footer — only shown for non-current versions */}
                {!isCurrentVersion(selectedVersion) && (
                  <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 shrink-0">
                    {confirmRestore?.version === selectedVersion.version ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            This will overwrite the current workflow. A backup version is saved automatically.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setConfirmRestore(null)}
                            disabled={restoring}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleRestore}
                            disabled={restoring}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 shadow-sm"
                          >
                            {restoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            <span>{restoring ? 'Restoring...' : 'Confirm Restore'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          Restoring will create a new version entry and mark this as current.
                        </p>
                        <button
                          onClick={() => setConfirmRestore(selectedVersion)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Restore to v{selectedVersion.version}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
