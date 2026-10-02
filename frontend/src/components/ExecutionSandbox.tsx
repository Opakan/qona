import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Square, RotateCcw, X, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Clock, Loader2, Zap, Eye,
  AlertTriangle, Terminal, ArrowRight, Layers,
  FlaskConical, Radio, Info, Copy, Check,
} from 'lucide-react';
import apiClient from '../api/client';
import type { InternalGraph } from '@qona/shared';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SandboxStep {
  index: number;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  warnings?: string[];
  credentialRequirements?: string[];
  plainEnglishExplanation?: string;
  executionTimeMs?: number;
  logs?: string[];
}

interface SandboxResult {
  sessionId: string;
  graphName: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  totalSteps: number;
  steps: SandboxStep[];
  summary?: string[];
  report?: string;
  totalDurationMs?: number;
  mode: 'mock' | 'live';
}

interface Props {
  graph: InternalGraph | null;
  workflowId?: string;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nodeIcon(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('webhook')) return '🔗';
  if (t.includes('openai') || t.includes('gpt')) return '🤖';
  if (t.includes('telegram')) return '✈️';
  if (t.includes('slack')) return '💬';
  if (t.includes('gmail') || t.includes('email')) return '📧';
  if (t.includes('google') && t.includes('sheet')) return '📊';
  if (t.includes('google') && t.includes('drive')) return '📁';
  if (t.includes('notion')) return '📓';
  if (t.includes('discord')) return '🎮';
  if (t.includes('supabase') || t.includes('postgres')) return '🗄️';
  if (t.includes('http')) return '🌐';
  if (t.includes('cron') || t.includes('schedule')) return '⏰';
  if (t.includes('stripe')) return '💳';
  if (t.includes('airtable')) return '🗂️';
  if (t.includes('github')) return '🐙';
  return '⚙️';
}

function statusColor(status: SandboxStep['status']): string {
  switch (status) {
    case 'success': return '#10b981';
    case 'failed': return '#ef4444';
    case 'running': return '#6366f1';
    case 'skipped': return '#6b7280';
    default: return '#4b5563';
  }
}

function JsonViewer({ data, label }: { data: unknown; label: string }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <pre style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 11,
        lineHeight: 1.6,
        color: '#94a3b8',
        overflowX: 'auto',
        maxHeight: 200,
        overflowY: 'auto',
        margin: 0,
        fontFamily: 'monospace',
      }}>
        {json}
      </pre>
    </div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────
function StepCard({
  step,
  isActive,
  isExpanded,
  onToggle,
  animationDelay,
}: {
  step: SandboxStep;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  animationDelay: number;
}) {
  const borderColor = statusColor(step.status);
  const isPending = step.status === 'pending';
  const isRunning = step.status === 'running';

  return (
    <div
      style={{
        border: `1px solid ${isActive ? borderColor : isPending ? '#1e293b' : borderColor + '55'}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 10,
        marginBottom: 10,
        background: isActive ? `${borderColor}08` : '#0f172a',
        transition: 'all 0.3s ease',
        opacity: isPending ? 0.5 : 1,
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '12px 14px',
          cursor: isPending ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textAlign: 'left',
        }}
      >
        {/* Step number + icon */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: `${borderColor}20`,
          border: `1.5px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          flexShrink: 0,
          position: 'relative',
        }}>
          {isRunning ? (
            <Loader2 size={14} color={borderColor} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <span>{nodeIcon(step.nodeType)}</span>
          )}
        </div>

        {/* Label + type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {step.nodeLabel}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
            {step.nodeType}
          </div>
        </div>

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {step.executionTimeMs != null && step.status === 'success' && (
            <span style={{ fontSize: 10, color: '#475569', background: '#1e293b', borderRadius: 4, padding: '2px 6px' }}>
              {step.executionTimeMs}ms
            </span>
          )}
          {step.status === 'success' && <CheckCircle2 size={16} color="#10b981" />}
          {step.status === 'failed' && <XCircle size={16} color="#ef4444" />}
          {step.status === 'running' && <Loader2 size={16} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />}
          {step.status === 'pending' && <Clock size={16} color="#4b5563" />}
          {step.warnings && step.warnings.length > 0 && (
            <AlertTriangle size={14} color="#f59e0b" />
          )}
          {step.status !== 'pending' && (
            isExpanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && step.status !== 'pending' && (
        <div style={{ padding: '0 14px 14px 14px', borderTop: '1px solid #1e293b' }}>
          {/* Plain English */}
          {step.plainEnglishExplanation && (
            <div style={{
              background: '#1e293b',
              borderRadius: 8,
              padding: '8px 12px',
              marginTop: 10,
              fontSize: 12,
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}>
              <Info size={13} color="#6366f1" style={{ marginTop: 1, flexShrink: 0 }} />
              {step.plainEnglishExplanation}
            </div>
          )}

          {/* Warnings */}
          {step.warnings && step.warnings.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {step.warnings.map((w, i) => (
                <div key={i} style={{
                  background: '#451a03',
                  border: '1px solid #92400e',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 11,
                  color: '#fcd34d',
                  display: 'flex',
                  gap: 6,
                  marginBottom: 4,
                }}>
                  <AlertTriangle size={12} style={{ marginTop: 1, flexShrink: 0 }} />
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* Input / Output */}
          {step.inputData && Object.keys(step.inputData).length > 0 && (
            <JsonViewer data={step.inputData} label="Input Data" />
          )}
          {step.outputData && Object.keys(step.outputData).length > 0 && (
            <JsonViewer data={step.outputData} label="Output Data" />
          )}

          {/* Logs */}
          {step.logs && step.logs.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Execution Logs
              </div>
              <div style={{
                background: '#020617',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: '8px 12px',
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#4ade80',
              }}>
                {step.logs.map((log, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>
                    <span style={{ color: '#334155', marginRight: 6 }}>&gt;</span>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ExecutionSandbox({ graph, workflowId, isOpen, onClose }: Props) {
  const [mode, setMode] = useState<'mock' | 'live'>('mock');
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [steps, setSteps] = useState<SandboxStep[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [animating, setAnimating] = useState(false);
  const [triggerPayload, setTriggerPayload] = useState('{}');
  const [showTriggerInput, setShowTriggerInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setResult(null);
      setSteps([]);
      setExpandedSteps(new Set());
      setError(null);
      setElapsedMs(0);
      setAnimating(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Animated step-by-step reveal
  const animateSteps = useCallback(async (completedSteps: SandboxStep[]) => {
    setAnimating(true);
    const pending: SandboxStep[] = completedSteps.map((s) => ({ ...s, status: 'pending' }));
    setSteps(pending);

    for (let i = 0; i < completedSteps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      setSteps((prev) => {
        const updated = [...prev];
        updated[i] = { ...completedSteps[i], status: 'running' };
        return updated;
      });

      await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 300));
      setSteps((prev) => {
        const updated = [...prev];
        updated[i] = completedSteps[i];
        return updated;
      });

      // Auto-expand successful steps briefly
      setExpandedSteps((prev) => {
        const next = new Set(prev);
        next.add(i);
        return next;
      });
    }
    setAnimating(false);
  }, []);

  const handleRun = async () => {
    if (!graph && !workflowId) return;
    setStatus('running');
    setError(null);
    setResult(null);
    startTimer();

    let parsedPayload: Record<string, unknown> = {};
    try {
      parsedPayload = JSON.parse(triggerPayload || '{}');
    } catch {
      parsedPayload = {};
    }

    try {
      const payload: Record<string, unknown> = {
        mode,
        triggerPayload: parsedPayload,
      };

      let endpoint = '/sandbox/run-graph';

      if (workflowId) {
        // Workflow saved in DB
        payload.workflowId = workflowId;
        endpoint = '/sandbox/run-graph';
      }

      if (graph) {
        payload.graph = graph;
      }

      const { data } = await apiClient.post(endpoint, payload);
      stopTimer();

      const sandboxResult: SandboxResult = {
        ...data,
        mode,
      };

      setResult(sandboxResult);
      setStatus(sandboxResult.status === 'failed' ? 'failed' : 'completed');

      // Animate steps one by one
      await animateSteps(sandboxResult.steps || []);
    } catch (err: any) {
      stopTimer();
      setStatus('failed');
      setError(err.response?.data?.error || err.message || 'Execution failed');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setSteps([]);
    setExpandedSteps(new Set());
    setError(null);
    setElapsedMs(0);
    setAnimating(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const successCount = steps.filter((s) => s.status === 'success').length;
  const failedCount = steps.filter((s) => s.status === 'failed').length;
  const totalMs = result?.totalDurationMs ?? elapsedMs;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      padding: 24,
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .sandbox-step-enter { animation: slideIn 0.3s ease forwards; }
      `}</style>

      <div style={{
        background: '#0a0f1e',
        border: '1px solid #1e293b',
        borderRadius: 20,
        width: '100%',
        maxWidth: 760,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
      }}>
        {/* ── Header ── */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(135deg, #0f172a 0%, #1a1040 100%)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FlaskConical size={20} color="white" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
              Execution Sandbox
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {graph?.metadata?.name ?? 'Draft Workflow'} · {graph?.nodes?.length ?? 0} nodes
            </div>
          </div>

          {/* Mode Toggle */}
          <div style={{
            display: 'flex',
            background: '#1e293b',
            borderRadius: 10,
            padding: 3,
            gap: 2,
          }}>
            {(['mock', 'live'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={status === 'running'}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: status === 'running' ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  background: mode === m
                    ? m === 'mock' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #059669, #10b981)'
                    : 'transparent',
                  color: mode === m ? 'white' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.2s',
                }}
              >
                {m === 'mock' ? <Layers size={12} /> : <Radio size={12} />}
                {m === 'mock' ? 'Mock' : 'Live'}
              </button>
            ))}
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Mode Info Banner ── */}
        <div style={{
          padding: '8px 24px',
          background: mode === 'mock' ? '#312e81' + '30' : '#064e3b' + '30',
          borderBottom: '1px solid #1e293b',
          fontSize: 11,
          color: mode === 'mock' ? '#a5b4fc' : '#6ee7b7',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}>
          {mode === 'mock' ? (
            <><Layers size={11} /> <strong>Mock Mode</strong> — Realistic simulated data, no external API calls made.</>
          ) : (
            <><Radio size={11} /> <strong>Live Mode</strong> — Simulation with real credential validation (no actual API calls in sandbox).</>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Trigger Payload Config */}
          {status === 'idle' && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setShowTriggerInput((v) => !v)}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: '8px 14px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  width: '100%',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Terminal size={13} />
                  Custom Trigger Payload (optional)
                </span>
                {showTriggerInput ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>

              {showTriggerInput && (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    value={triggerPayload}
                    onChange={(e) => setTriggerPayload(e.target.value)}
                    placeholder='{ "text": "Hello from my trigger" }'
                    rows={4}
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: '10px 12px',
                      color: '#94a3b8',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: '#450a0a',
              border: '1px solid #7f1d1d',
              borderRadius: 10,
              padding: '12px 16px',
              color: '#fca5a5',
              fontSize: 13,
              marginBottom: 20,
              display: 'flex',
              gap: 8,
            }}>
              <XCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Steps List */}
          {steps.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Execution Steps
              </div>
              {steps.map((step, i) => (
                <div key={step.nodeId} className="sandbox-step-enter" style={{ animationDelay: `${i * 50}ms` }}>
                  <StepCard
                    step={step}
                    isActive={step.status === 'running'}
                    isExpanded={expandedSteps.has(i)}
                    onToggle={() => toggleStep(i)}
                    animationDelay={i * 80}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Report */}
          {result?.report && status === 'completed' && !animating && (
            <div style={{
              marginTop: 16,
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 10,
              padding: '14px 16px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Execution Report
              </div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                {result.report}
              </div>
            </div>
          )}

          {/* Idle placeholder */}
          {status === 'idle' && steps.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: '#334155',
            }}>
              <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }}>⚗️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Ready to Execute
              </div>
              <div style={{ fontSize: 13, color: '#334155', maxWidth: 320, margin: '0 auto' }}>
                Click <strong style={{ color: '#6366f1' }}>Run</strong> to execute your workflow step-by-step with simulated data.
              </div>
              {graph?.nodes && (
                <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {graph.nodes.slice(0, 5).map((node) => (
                    <div key={node.id} style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: 12,
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}>
                      {nodeIcon(node.type)} {node.label || node.type}
                    </div>
                  ))}
                  {(graph.nodes.length > 5) && (
                    <div style={{
                      background: '#1e293b',
                      border: '1px dashed #334155',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: 12,
                      color: '#475569',
                    }}>
                      +{graph.nodes.length - 5} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: '#0a0f1e',
        }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            {status !== 'idle' && (
              <>
                <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={13} /> {successCount} passed
                </div>
                {failedCount > 0 && (
                  <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <XCircle size={13} /> {failedCount} failed
                  </div>
                )}
                <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={13} /> {totalMs > 0 ? `${totalMs}ms` : `${elapsedMs}ms`}
                </div>
              </>
            )}
            {status === 'idle' && graph?.nodes && (
              <div style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Layers size={13} /> {graph.nodes.length} nodes
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(status === 'completed' || status === 'failed') && (
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #334155',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}

            {status === 'idle' && (
              <button
                onClick={handleRun}
                disabled={!graph && !workflowId}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  cursor: (!graph && !workflowId) ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                  transition: 'all 0.2s',
                  opacity: (!graph && !workflowId) ? 0.5 : 1,
                }}
              >
                <Play size={14} fill="white" /> Run Workflow
              </button>
            )}

            {status === 'running' && (
              <button
                disabled
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  cursor: 'not-allowed',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: 0.8,
                }}
              >
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Executing...
              </button>
            )}

            {(status === 'completed' || status === 'failed') && !animating && (
              <button
                onClick={handleRun}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                }}
              >
                <RotateCcw size={14} /> Re-run
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
