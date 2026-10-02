import React, { useState } from 'react';
import {
  X,
  Download,
  ArrowRight,
  CheckCircle2,
  Zap,
  Layers,
  Copy,
  Check,
  Code2,
  Sparkles,
  Workflow
} from 'lucide-react';
import type { Template } from '@qona/shared';

interface TemplateDetailsModalProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onUseTemplate: (template: Template) => void;
}

export function downloadTemplateJson(template: Template) {
  const exportData = {
    name: template.name,
    description: template.description,
    category: template.category,
    nodes: template.graph?.nodes || [],
    connections: (template.graph as any)?.connections || {},
    settings: {
      executionOrder: 'v1'
    },
    meta: {
      templateId: template.id,
      generator: 'Qonace AI Automation Studio',
      difficulty: template.difficulty,
      tags: template.tags,
      exportedAt: new Date().toISOString()
    }
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `${(template.slug || template.name).toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_workflow.json`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const TemplateDetailsModal: React.FC<TemplateDetailsModalProps> = ({
  template,
  isOpen,
  onClose,
  onUseTemplate,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'json'>('overview');

  if (!isOpen || !template) return null;

  const nodeCount = template.graph?.nodes?.length || 0;
  const tags = template.tags || [];

  const handleCopyJson = () => {
    const exportData = {
      name: template.name,
      description: template.description,
      category: template.category,
      nodes: template.graph?.nodes || [],
      connections: (template.graph as any)?.connections || {},
      settings: { executionOrder: 'v1' }
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    downloadTemplateJson(template);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                {template.category || 'AI Automation'}
              </span>
              <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                template.difficulty === 'Advanced'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                  : template.difficulty === 'Intermediate'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
              }`}>
                {template.difficulty || 'Intermediate'}
              </span>
              {nodeCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Layers className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  {nodeCount} Nodes
                </span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black font-display text-slate-900 dark:text-white tracking-tight leading-snug">
              {template.name}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-150 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Workflow className="h-3.5 w-3.5" />
            <span>Workflow Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'json'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>n8n JSON Preview</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' ? (
            <>
              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Summary & Purpose
                </h4>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-150 dark:border-slate-800">
                  {template.description || 'Pre-configured workflow template ready for production deployment.'}
                </p>
              </div>

              {/* Step-by-Step Plain English Breakdown */}
              {Array.isArray(template.plainEnglishSummary) && template.plainEnglishSummary.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                    Execution Steps
                  </h4>
                  <div className="space-y-2.5">
                    {template.plainEnglishSummary.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs"
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 text-[11px] font-extrabold mt-0.5">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Integrated Services & Tags */}
              {tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    Integrated Services & Apps
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  n8n-Compatible Workflow Schema
                </span>
                <button
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-[300px] leading-relaxed border border-slate-800">
                {JSON.stringify(
                  {
                    name: template.name,
                    nodes: template.graph?.nodes || [],
                    connections: (template.graph as any)?.connections || {},
                    settings: { executionOrder: 'v1' }
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-5 border-t border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
          <button
            onClick={handleDownload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            <span>Download Workflow JSON</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopyJson}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => {
                onUseTemplate(template);
                onClose();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-lg transition-all cursor-pointer"
            >
              <span>Launch in Studio</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
