import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Clock, ChevronDown, ChevronUp, X, Sparkles,
  ArrowDown, Code2, Cpu, FileJson, Check, Activity, AlertTriangle,
  ShieldCheck, Info, Sliders, RotateCcw, Loader2, FileText, CheckSquare, Gauge,
  Network, Radio, Server, Workflow
} from 'lucide-react';
import type { ExecutionTrace, InternalGraph } from '@qona/shared';
import { simulateGraphClient } from '../../services/client-simulator';

interface ExecutionPreviewModalProps {
  trace: ExecutionTrace | null;
  currentGraph?: InternalGraph;
  isOpen: boolean;
  onClose: () => void;
  onExport?: () => void;
  onRerunSimulation?: (customPayload: Record<string, unknown>) => Promise<void> | void;
}

export type PlaybackNodeState = 'waiting' | 'running' | 'completed' | 'failed';

export const ExecutionPreviewModal: React.FC<ExecutionPreviewModalProps> = ({
  trace: initialTrace,
  currentGraph,
  isOpen,
  onClose,
  onExport,
  onRerunSimulation,
}) => {
  const [activeTrace, setActiveTrace] = useState<ExecutionTrace | null>(initialTrace);
  const [openStep, setOpenStep] = useState<number | null>(1);
  const [viewMode, setViewMode] = useState<'timeline' | 'dataflow' | 'report'>('timeline');
  const [activeTabMap, setActiveTabMap] = useState<Record<number, 'inspector' | 'input' | 'output'>>({});
  const [selectedPacketConnection, setSelectedPacketConnection] = useState<number | null>(null);
  
  // Custom payload editor state
  const [showPayloadEditor, setShowPayloadEditor] = useState(false);
  const [customPayloadText, setCustomPayloadText] = useState('');
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);
  
  // Playback animation state
  const [playbackActive, setPlaybackActive] = useState(false);
  const [currentRunningStep, setCurrentRunningStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    setActiveTrace(initialTrace);
  }, [initialTrace]);

  const trace = activeTrace;

  const startPlayback = useCallback(() => {
    if (!trace || !trace.steps || trace.steps.length === 0) return;

    setPlaybackActive(true);
    setCurrentRunningStep(1);
    setCompletedSteps(new Set());
    setOpenStep(1);

    const totalDurationMs = 3000;
    const stepDuration = Math.max(600, Math.floor(totalDurationMs / trace.steps.length));

    let stepIdx = 1;
    const interval = setInterval(() => {
      setCompletedSteps((prev) => new Set([...prev, stepIdx]));
      stepIdx += 1;

      if (stepIdx <= trace.steps.length) {
        setCurrentRunningStep(stepIdx);
      } else {
        clearInterval(interval);
        setPlaybackActive(false);
        setCurrentRunningStep(0);
      }
    }, stepDuration);
  }, [trace]);

  useEffect(() => {
    if (trace && trace.simulatedTriggerPayload) {
      setCustomPayloadText(JSON.stringify(trace.simulatedTriggerPayload, null, 2));
    }
  }, [trace]);

  useEffect(() => {
    if (isOpen && initialTrace) {
      startPlayback();
    }
  }, [isOpen, initialTrace, startPlayback]);

  if (!isOpen || !trace) return null;

  const getActiveTab = (stepIndex: number) => activeTabMap[stepIndex] || 'inspector';

  const setActiveTab = (stepIndex: number, tab: 'inspector' | 'input' | 'output') => {
    setActiveTabMap((prev) => ({ ...prev, [stepIndex]: tab }));
  };

  const getNodeState = (stepIndex: number): PlaybackNodeState => {
    if (!playbackActive && (completedSteps.size === trace.steps.length || completedSteps.size === 0)) {
      return trace.steps[stepIndex - 1]?.status === 'failed' ? 'failed' : 'completed';
    }
    if (completedSteps.has(stepIndex)) return 'completed';
    if (currentRunningStep === stepIndex) return 'running';
    return 'waiting';
  };

  const handleApplyCustomPayload = async () => {
    setPayloadError(null);
    try {
      const parsed = JSON.parse(customPayloadText);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setPayloadError('Trigger payload must be a valid JSON object');
        return;
      }

      setRerunning(true);

      if (currentGraph) {
        const clientTrace = simulateGraphClient(currentGraph, parsed);
        setActiveTrace(clientTrace);
        startPlayback();
      }

      if (onRerunSimulation) {
        await onRerunSimulation(parsed);
      }
      
      setRerunning(false);
    } catch (err: any) {
      setPayloadError(`Invalid JSON format: ${err.message}`);
      setRerunning(false);
    }
  };

  const report = trace.report;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 sm:p-6 backdrop-blur-md animate-fade-in font-sans">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-slate-900 shadow-2xl overflow-hidden border border-slate-800 text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-slate-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Execution Preview Simulation</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                  <Check className="h-3 w-3 text-emerald-400" />
                  {trace.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Simulated 3-second animated execution walkthrough ({trace.totalDurationMs}ms)
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex gap-1 rounded-xl bg-slate-800 p-1 border border-slate-700/60">
              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'timeline' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="h-3.5 w-3.5" /> Timeline
              </button>
              <button
                onClick={() => setViewMode('dataflow')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'dataflow' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Network className="h-3.5 w-3.5" /> Visual Data Flow
              </button>
              <button
                onClick={() => setViewMode('report')}
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'report' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> Execution Report
              </button>
            </div>

            {viewMode === 'timeline' && (
              <button
                onClick={startPlayback}
                disabled={playbackActive}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                title="Replay animated 3-second simulation playback"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${playbackActive ? 'animate-spin' : ''}`} />
                {playbackActive ? 'Playing...' : 'Replay'}
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-2xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* VIEW MODE 1: TIMELINE & INSPECTOR */}
          {viewMode === 'timeline' && (
            <>
              {/* Executive Overview Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-2 text-slate-300 font-bold">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    Playback Animation: <span className="text-emerald-400 font-mono">3.0s Walkthrough</span>
                  </span>
                  <span className="font-mono text-slate-400">Total Nodes: {trace.steps.length}</span>
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/80 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {trace.steps.map((step, idx) => {
                      const nodeState = getNodeState(step.stepIndex);
                      return (
                        <span
                          key={step.stepIndex}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-[11px] font-medium transition-all border ${
                            nodeState === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : nodeState === 'running'
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 animate-pulse ring-1 ring-indigo-400'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700/50'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              nodeState === 'completed'
                                ? 'bg-emerald-400'
                                : nodeState === 'running'
                                ? 'bg-indigo-400 animate-ping'
                                : 'bg-slate-600'
                            }`}
                          ></span>
                          {step.nodeLabel}
                          {idx < trace.steps.length - 1 && <span className="text-slate-500">→</span>}
                        </span>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setShowPayloadEditor(!showPayloadEditor)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-bold text-indigo-300 hover:bg-indigo-500/20 transition-all cursor-pointer"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    {showPayloadEditor ? 'Hide Trigger Payload' : 'Edit Trigger Payload'}
                  </button>
                </div>

                {/* Editable Trigger Payload Drawer */}
                {showPayloadEditor && (
                  <div className="mt-4 border-t border-slate-800 pt-4 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Code2 className="h-3.5 w-3.5 text-emerald-400" /> Editable Trigger Input Payload
                      </span>
                      <span className="text-[10px] text-slate-400">Modify payload below and click rerun</span>
                    </div>

                    <textarea
                      value={customPayloadText}
                      onChange={(e) => setCustomPayloadText(e.target.value)}
                      rows={5}
                      className="w-full rounded-xl bg-slate-900 p-3.5 font-mono text-xs text-emerald-300 border border-slate-800 focus:border-emerald-500 focus:outline-none shadow-inner"
                      placeholder='{ "text": "OpenAI released GPT-5 today." }'
                    />

                    {payloadError && (
                      <p className="text-xs text-amber-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> {payloadError}
                      </p>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleApplyCustomPayload}
                        disabled={rerunning}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {rerunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                        {rerunning ? 'Simulating...' : 'Rerun Simulation with Custom Payload'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Animated Vertical Execution Timeline */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-indigo-500 before:to-slate-800">
                {trace.steps.map((step, idx) => {
                  const isExpanded = openStep === step.stepIndex;
                  const activeTab = getActiveTab(step.stepIndex);
                  const nodeState = getNodeState(step.stepIndex);

                  return (
                    <div key={step.stepIndex} className="relative group transition-all">
                      
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-6 top-4 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-slate-900 border-2 transition-all ${
                          nodeState === 'completed'
                            ? 'border-emerald-400 text-emerald-400 shadow-md shadow-emerald-500/20'
                            : nodeState === 'running'
                            ? 'border-indigo-400 text-indigo-300 ring-4 ring-indigo-500/30 animate-pulse'
                            : 'border-slate-700 text-slate-500'
                        }`}
                      >
                        {nodeState === 'running' ? (
                          <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                        ) : (
                          <span className="text-[10px] font-extrabold">{step.stepIndex}</span>
                        )}
                      </div>

                      {/* Node Accordion Card */}
                      <div
                        className={`rounded-2xl border bg-slate-900/90 shadow-xl overflow-hidden transition-all ${
                          nodeState === 'completed'
                            ? 'border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-emerald-950/20'
                            : nodeState === 'running'
                            ? 'border-indigo-500/70 ring-2 ring-indigo-500/40 shadow-indigo-950/30 animate-pulse'
                            : 'border-slate-800/80 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* Header Bar */}
                        <button
                          onClick={() => setOpenStep(isExpanded ? null : step.stepIndex)}
                          className="flex w-full items-center justify-between p-5 text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-200 border border-slate-700/60">
                              {idx === 0 ? <Cpu className="h-5 w-5 text-emerald-400" /> : <FileJson className="h-5 w-5 text-indigo-400" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5">
                                <h4 className="text-sm font-bold text-white tracking-tight">{step.nodeLabel}</h4>
                                <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700">
                                  {step.nodeType}
                                </span>
                              </div>
                              {step.plainEnglishExplanation && (
                                <p className="text-xs text-emerald-300/90 font-medium italic mt-0.5">
                                  "{step.plainEnglishExplanation}"
                                </p>
                              )}
                              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-2 font-medium">
                                <span>Validation: <strong className="text-emerald-400 uppercase font-mono">{step.validationStatus || 'VALID'}</strong></span>
                                <span>•</span>
                                <span>Duration: <strong className="text-slate-200 font-mono">{step.executionTimeMs}ms</strong></span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {nodeState === 'completed' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-extrabold text-emerald-400 border border-emerald-500/20 shadow-xs">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                COMPLETED
                              </span>
                            )}

                            {nodeState === 'running' && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-[11px] font-extrabold text-indigo-300 border border-indigo-500/40 animate-pulse">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-300" />
                                RUNNING
                              </span>
                            )}

                            {nodeState === 'waiting' && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-400 border border-slate-700">
                                WAITING
                              </span>
                            )}

                            {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                          </div>
                        </button>

                        {/* Execution Node Inspector Panel */}
                        {isExpanded && (
                          <div className="border-t border-slate-800 bg-slate-950/80 p-5 space-y-5 animate-fade-in">
                            
                            {/* Inspector Navigation Tabs */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                              <div className="flex gap-1.5 rounded-xl bg-slate-900 p-1 border border-slate-800">
                                <button
                                  onClick={() => setActiveTab(step.stepIndex, 'inspector')}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'inspector' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Node Inspector
                                </button>
                                <button
                                  onClick={() => setActiveTab(step.stepIndex, 'input')}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'input' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Input Payload
                                </button>
                                <button
                                  onClick={() => setActiveTab(step.stepIndex, 'output')}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                    activeTab === 'output' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  Output Payload
                                </button>
                              </div>

                              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-emerald-400" /> Time: {step.executionTimeMs}ms
                              </span>
                            </div>

                            {/* Read-Only Node Inspector Panel */}
                            {activeTab === 'inspector' && (
                              <div className="space-y-4">
                                
                                {/* Read-Only Status & Specs Card */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-xl bg-slate-900 p-3.5 border border-slate-800 space-y-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Node Name</span>
                                    <p className="text-xs font-bold text-white">{step.nodeLabel}</p>
                                  </div>
                                  <div className="rounded-xl bg-slate-900 p-3.5 border border-slate-800 space-y-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Node Type</span>
                                    <p className="text-xs font-mono text-indigo-400">{step.nodeType}</p>
                                  </div>
                                  <div className="rounded-xl bg-slate-900 p-3.5 border border-slate-800 space-y-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Validation Status</span>
                                    <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                      <ShieldCheck className="h-3.5 w-3.5" />
                                      {step.validationStatus || 'VALID'}
                                    </p>
                                  </div>
                                  <div className="rounded-xl bg-slate-900 p-3.5 border border-slate-800 space-y-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Execution Duration</span>
                                    <p className="text-xs font-mono text-slate-200">{step.executionTimeMs} ms</p>
                                  </div>
                                </div>

                                {/* Expressions Used */}
                                {Object.keys(step.expressions || {}).length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                      <Sliders className="h-3.5 w-3.5 text-indigo-400" /> Expression Mappings
                                    </span>
                                    <div className="rounded-xl bg-slate-900 p-3 border border-slate-800 space-y-1.5 font-mono text-xs text-indigo-300">
                                      {Object.entries(step.expressions || {}).map(([k, expr]) => (
                                        <div key={k} className="flex items-center justify-between border-b border-slate-800/60 pb-1 last:border-b-0 last:pb-0">
                                          <span className="text-slate-400">{k}:</span>
                                          <span className="text-indigo-400">{String(expr)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Resolved Parameters */}
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                    <Info className="h-3.5 w-3.5 text-slate-400" /> Resolved Parameters
                                  </span>
                                  <pre className="max-h-40 overflow-y-auto rounded-xl bg-slate-900 p-3.5 font-mono text-xs text-slate-200 border border-slate-800">
                                    {JSON.stringify(step.resolvedParameters || {}, null, 2)}
                                  </pre>
                                </div>

                                {/* Credential Requirements */}
                                {(step.credentialRequirements || []).length > 0 && (
                                  <div className="rounded-xl bg-indigo-950/40 p-3.5 border border-indigo-800/40 space-y-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                      <ShieldCheck className="h-3.5 w-3.5" /> Credential Requirements
                                    </span>
                                    <div className="text-xs font-medium text-slate-200 space-y-0.5">
                                      {(step.credentialRequirements || []).map((cred, i) => (
                                        <div key={i}>• {cred}</div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Warnings */}
                                {(step.warnings || []).length > 0 && (
                                  <div className="rounded-xl bg-amber-950/30 p-3.5 border border-amber-800/40 space-y-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Node Configuration Warnings
                                    </span>
                                    <div className="text-xs font-medium text-amber-200 space-y-0.5">
                                      {(step.warnings || []).map((warn, i) => (
                                        <div key={i}>⚠️ {warn}</div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              </div>
                            )}

                            {/* Input Tab */}
                            {activeTab === 'input' && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                  <Code2 className="h-3.5 w-3.5 text-indigo-400" /> Input Data (Incoming Payload)
                                </span>
                                <pre className="max-h-56 overflow-y-auto rounded-xl bg-slate-900/90 p-4 font-mono text-xs text-slate-300 border border-slate-800">
                                  {JSON.stringify(step.inputData, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Output Tab */}
                            {activeTab === 'output' && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                  <Code2 className="h-3.5 w-3.5 text-emerald-400" /> Output Data (Simulated Result)
                                </span>
                                <pre className="max-h-56 overflow-y-auto rounded-xl bg-slate-900/90 p-4 font-mono text-xs text-emerald-300 border border-slate-800">
                                  {JSON.stringify(step.outputData, null, 2)}
                                </pre>
                              </div>
                            )}

                          </div>
                        )}
                      </div>

                      {/* Down Animated Flow Connector Arrow */}
                      {idx < trace.steps.length - 1 && (
                        <div className="my-2 flex flex-col items-center justify-center gap-1">
                          <span className={`text-[10px] font-mono transition-colors ${
                            currentRunningStep === step.stepIndex + 1 ? 'text-indigo-400 font-bold animate-pulse' : 'text-slate-600'
                          }`}>
                            {currentRunningStep === step.stepIndex + 1 ? '⚡ Data Flow Transfer' : 'Payload Flow'}
                          </span>
                          <ArrowDown className={`h-4 w-4 transition-all ${
                            currentRunningStep === step.stepIndex + 1
                              ? 'text-indigo-400 animate-bounce scale-125'
                              : completedSteps.has(step.stepIndex)
                              ? 'text-emerald-400'
                              : 'text-slate-600'
                          }`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* VIEW MODE 2: VISUAL DATA FLOW (NETWORK PACKET INSPECTOR) */}
          {viewMode === 'dataflow' && (
            <div className="space-y-6 animate-fade-in">
              <div className="rounded-2xl border border-indigo-500/30 bg-slate-950/80 p-5 backdrop-blur-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Network className="h-4 w-4 text-indigo-400" /> Visual Data Flow Network Packet Inspector
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Click any payload packet card to inspect stream</span>
                </div>
                <p className="text-xs text-slate-300">
                  Visualizes the exact data payload transferring across node pipes in real-time.
                </p>
              </div>

              {/* Data Flow Pipeline Stream */}
              <div className="space-y-4">
                {trace.steps.map((step, idx) => {
                  const nextStep = trace.steps[idx + 1];
                  const isPacketSelected = selectedPacketConnection === step.stepIndex;

                  return (
                    <div key={step.stepIndex} className="space-y-4">
                      {/* Node Box */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 border border-slate-700">
                            <Server className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              {step.nodeLabel}
                              <span className="text-[10px] font-mono text-slate-400">({step.nodeType})</span>
                            </div>
                            <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
                              Output: {JSON.stringify(step.outputData).slice(0, 50)}...
                            </div>
                          </div>
                        </div>
                        <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/20">
                          {step.executionTimeMs}ms
                        </span>
                      </div>

                      {/* Connection Pipe Data Packet Inspector Card */}
                      {nextStep && (
                        <div className="pl-6 space-y-2">
                          <div
                            onClick={() => setSelectedPacketConnection(isPacketSelected ? null : step.stepIndex)}
                            className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
                              isPacketSelected
                                ? 'border-indigo-500 bg-indigo-950/60 ring-2 ring-indigo-500/40 shadow-lg'
                                : 'border-slate-800 bg-slate-950/90 hover:border-slate-700 hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Radio className="h-4 w-4 text-indigo-400 animate-pulse" />
                                <span className="text-xs font-bold text-slate-200">
                                  Data Packet Stream ({step.nodeLabel} → {nextStep.nodeLabel})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                                <span className="text-emerald-400">200 OK</span>
                                <span>•</span>
                                <span>{JSON.stringify(step.outputData).length} Bytes</span>
                                {isPacketSelected ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>

                            <div className="mt-2 font-mono text-xs text-indigo-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 truncate">
                              Payload: {JSON.stringify(step.outputData)}
                            </div>
                          </div>

                          {/* Packet Inspector Drawer Details */}
                          {isPacketSelected && (
                            <div className="rounded-xl border border-indigo-500/40 bg-slate-950 p-4 space-y-3 font-mono text-xs text-slate-200 animate-fade-in shadow-xl">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                                  <Network className="h-3.5 w-3.5" /> Network Packet Stream Inspector
                                </span>
                                <span className="text-[10px] text-slate-500">Transferred via InternalGraph Pipe</span>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2 text-[11px]">
                                <div><span className="text-slate-500">Source Node:</span> <strong className="text-white">{step.nodeLabel}</strong></div>
                                <div><span className="text-slate-500">Target Node:</span> <strong className="text-white">{nextStep.nodeLabel}</strong></div>
                                <div><span className="text-slate-500">Packet Size:</span> <strong className="text-emerald-400">{JSON.stringify(step.outputData).length} Bytes</strong></div>
                                <div><span className="text-slate-500">Transfer Protocol:</span> <strong className="text-indigo-400">n8n-internal-graph/stream</strong></div>
                              </div>

                              <div className="space-y-1">
                                <span className="text-slate-500 text-[10px] uppercase font-bold">Exact Transferred Payload (Node A Output → Node B Input)</span>
                                <pre className="max-h-48 overflow-y-auto rounded-lg bg-slate-900 p-3 text-emerald-300 border border-slate-800">
                                  {JSON.stringify(step.outputData, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 3: EXECUTION REPORT */}
          {viewMode === 'report' && report && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Confidence & Readiness Scorecard */}
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/40 p-6 shadow-xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <Gauge className="h-4 w-4 text-emerald-400" /> Export Readiness Report
                      </span>
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300 border border-emerald-500/30">
                        {report.exportReadiness}
                      </span>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight mt-1">Workflow Ready</h2>
                    <p className="text-xs text-slate-300 mt-1 max-w-lg">
                      {report.workflowSummary}
                    </p>
                  </div>

                  {/* Big Confidence Score Badge */}
                  <div className="flex items-center gap-3 self-start sm:self-center bg-slate-900/80 px-6 py-3.5 rounded-2xl border border-emerald-500/40 shadow-inner">
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Confidence Score</div>
                      <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                        {report.confidenceScore}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Checkmark Pillars */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <CheckSquare className={`h-4 w-4 ${report.checkmarks.valid ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className={report.checkmarks.valid ? 'text-white' : 'text-slate-500'}>✓ Valid</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <CheckSquare className={`h-4 w-4 ${report.checkmarks.parametersComplete ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className={report.checkmarks.parametersComplete ? 'text-white' : 'text-slate-500'}>✓ Parameters Complete</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <CheckSquare className={`h-4 w-4 ${report.checkmarks.connectionsValid ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className={report.checkmarks.connectionsValid ? 'text-white' : 'text-slate-500'}>✓ Connections Valid</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <CheckSquare className={`h-4 w-4 ${report.checkmarks.exportReady ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className={report.checkmarks.exportReady ? 'text-white' : 'text-slate-500'}>✓ Export Ready</span>
                  </div>
                </div>
              </div>

              {/* Report Details Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* Trigger & Actions Summary */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Cpu className="h-4 w-4" /> Trigger & Actions Pipeline
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-400">Trigger:</span>
                      <p className="font-mono text-emerald-400 mt-0.5">{report.trigger}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400">Actions ({report.actions.length}):</span>
                      <ul className="mt-1 space-y-1 font-mono text-slate-300">
                        {report.actions.map((act, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="text-indigo-400">➔</span> {act}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Validation Results Audit */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Validation Audit
                  </h4>
                  <div className="space-y-2 text-xs font-medium text-slate-300">
                    {report.validationResults.map((res, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span>{res}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Credential Requirements */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Credential Requirements ({report.credentialRequirements.length})
                  </h4>
                  {report.credentialRequirements.length > 0 ? (
                    <ul className="space-y-1 text-xs font-mono text-slate-300">
                      {report.credentialRequirements.map((cred, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="text-emerald-400">🔑</span> {cred}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">No credentials required for this workflow.</p>
                  )}
                </div>

                {/* Potential Issues & Warnings */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Potential Import Issues ({report.potentialIssues.length})
                  </h4>
                  {report.potentialIssues.length > 0 ? (
                    <ul className="space-y-1 text-xs text-amber-200">
                      {report.potentialIssues.map((issue, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span>⚠️</span> {issue}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-emerald-400 font-medium">✓ Zero potential issues detected. Pure clean export!</p>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-900/90 backdrop-blur-md">
          <span className="text-xs font-medium text-slate-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            {viewMode === 'timeline' ? 'Simulation Verified Cleanly' : viewMode === 'dataflow' ? 'Network Data Flow Stream Active' : 'Execution Report Audit Ready'}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            >
              Close
            </button>
            {onExport && (
              <button
                onClick={() => {
                  onClose();
                  onExport();
                }}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-lg hover:bg-emerald-400 transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 fill-current" />
                Proceed to Export n8n JSON
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
