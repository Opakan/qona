import React, { useState, useEffect } from 'react';
import {
  CloudUpload, X, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff,
  ExternalLink, Server, Key, Zap, ShieldCheck, Check, Sparkles
} from 'lucide-react';
import apiClient from '../api/client';

interface DeployN8nModalProps {
  workflowId?: string;
  workflowName?: string;
  graph?: any;
  isOpen: boolean;
  onClose: () => void;
}

export const DeployN8nModal: React.FC<DeployN8nModalProps> = ({
  workflowId,
  workflowName,
  graph,
  isOpen,
  onClose,
}) => {
  const [n8nUrl, setN8nUrl] = useState('https://primary.n8n.cloud');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [activate, setActivate] = useState(true);
  const [rememberConfig, setRememberConfig] = useState(true);

  // Status states
  const [testing, setTesting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [deployResult, setDeployResult] = useState<{
    success: boolean;
    n8nWorkflowId?: string;
    editorUrl?: string;
    message?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load saved n8n connection details from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qonace_n8n_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.n8nUrl) setN8nUrl(parsed.n8nUrl);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  if (!isOpen) return null;

  const handleSaveConfig = (url: string, key: string) => {
    if (rememberConfig) {
      localStorage.setItem('qonace_n8n_config', JSON.stringify({ n8nUrl: url, apiKey: key }));
    }
  };

  const handleTestConnection = async () => {
    if (!n8nUrl || !apiKey) {
      setErrorMsg('Please provide both your n8n Instance URL and API Key.');
      return;
    }
    setErrorMsg(null);
    setTesting(true);
    setTestResult(null);

    try {
      const res = await apiClient.post('/deploy/n8n/test', {
        n8nUrl: n8nUrl.trim(),
        apiKey: apiKey.trim(),
      });
      setTestResult({
        success: true,
        message: res.data?.message || 'Connection verified successfully!',
      });
      handleSaveConfig(n8nUrl, apiKey);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to connect to n8n instance.';
      setTestResult({
        success: false,
        message: msg,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleDeploy = async () => {
    if (!n8nUrl || !apiKey) {
      setErrorMsg('Please enter your n8n Instance URL and API Key.');
      return;
    }

    setErrorMsg(null);
    setDeploying(true);
    setDeployResult(null);

    try {
      const res = await apiClient.post('/deploy/n8n', {
        n8nUrl: n8nUrl.trim(),
        apiKey: apiKey.trim(),
        workflowId,
        graph,
        activate,
      });

      setDeployResult({
        success: true,
        n8nWorkflowId: res.data?.n8nWorkflowId,
        editorUrl: res.data?.editorUrl,
        message: res.data?.message || 'Workflow deployed to n8n successfully!',
      });

      handleSaveConfig(n8nUrl, apiKey);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Deployment to n8n failed.';
      setErrorMsg(msg);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-lg shadow-orange-500/20">
              <CloudUpload className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Deploy to n8n Cloud
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900">
                  Direct API
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target: <span className="font-semibold text-slate-700 dark:text-slate-200">{workflowName || 'Current Workflow'}</span>
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-900 dark:text-slate-100">
          {/* General Error Banner */}
          {errorMsg && (
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Success Result Banner */}
          {deployResult?.success && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span>{deployResult.message}</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300/80">
                Your workflow was converted and posted directly to your n8n workspace (ID: <code className="font-mono text-emerald-800 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">{deployResult.n8nWorkflowId}</code>).
              </p>
              {deployResult.editorUrl && (
                <a
                  href={deployResult.editorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                >
                  <span>Open Workflow in n8n</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Form Inputs */}
          <div className="space-y-4">
            {/* Server URL */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                n8n Instance URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Server className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={n8nUrl}
                  onChange={(e) => setN8nUrl(e.target.value)}
                  placeholder="https://your-instance.n8n.cloud or http://localhost:5678"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Works with n8n Cloud, self-hosted Docker, Railway, or local n8n servers.
              </p>
            </div>

            {/* API Key */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  n8n API Key (X-N8N-API-KEY)
                </label>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" /> Never stored on server
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="n8n_api_key_..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Generate in n8n under <strong>Settings &gt; API &gt; Create API key</strong>.
              </p>
            </div>

            {/* Test Connection Button & Status */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !n8nUrl || !apiKey}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all disabled:opacity-50"
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" /> : <Zap className="h-3.5 w-3.5 text-amber-500" />}
                <span>Test API Key</span>
              </button>

              {testResult && (
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {testResult.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            <hr className="border-slate-100 dark:border-slate-800 my-2" />

            {/* Options Checkboxes */}
            <div className="space-y-3">
              {/* Auto activate */}
              <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 cursor-pointer hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Activate workflow after deployment
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Toggles workflow state to active in n8n so triggers listen immediately.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={activate}
                  onChange={(e) => setActivate(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 accent-orange-600 cursor-pointer"
                />
              </label>

              {/* Save config locally */}
              <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 cursor-pointer hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Save connection details in browser
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Stores URL &amp; key in local browser storage so you don&apos;t re-type them.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={rememberConfig}
                  onChange={(e) => setRememberConfig(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 accent-orange-600 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDeploy}
            disabled={deploying || !n8nUrl || !apiKey}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold text-xs shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            {deploying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Deploying to n8n...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Deploy Workflow Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
