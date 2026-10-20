import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Check,
  Split,
  MessageSquare,
  Mail,
  Table,
  Globe,
  Sliders,
  Eye,
  Shield,
  HelpCircle,
  Pencil,
  Clock,
  Send,
  CreditCard,
  Layers,
} from 'lucide-react';

export interface GraphNodeData {
  id: string;
  type: string;
  label: string;
  description?: string;
  position: { x: number; y: number };
  config?: Record<string, unknown>;
  connections?: string[];
}

interface NodeInspectorModalProps {
  node: GraphNodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, newConfig: Record<string, unknown>, newLabel?: string) => void;
  onDelete?: (nodeId: string) => void;
}

// Brand color helper
export function getNodeBrandInfo(type: string) {
  const clean = type.toLowerCase().replace(/^n8n-nodes-base\./, '');
  if (clean.includes('stripe')) {
    return { name: 'Stripe', bg: 'bg-[#635BFF]', text: 'text-[#635BFF]', border: 'border-[#635BFF]', icon: CreditCard };
  }
  if (clean.includes('slack')) {
    return { name: 'Slack', bg: 'bg-[#4A154B]', text: 'text-[#4A154B]', border: 'border-[#4A154B]', icon: MessageSquare };
  }
  if (clean.includes('gmail') || clean.includes('email')) {
    return { name: 'Gmail / Email', bg: 'bg-[#EA4335]', text: 'text-[#EA4335]', border: 'border-[#EA4335]', icon: Mail };
  }
  if (clean.includes('sheet') || clean.includes('google')) {
    return { name: 'Google Sheets', bg: 'bg-[#0F9D58]', text: 'text-[#0F9D58]', border: 'border-[#0F9D58]', icon: Table };
  }
  if (clean.includes('if') || clean.includes('filter')) {
    return { name: 'Condition (If / Else)', bg: 'bg-[#FF6D5A]', text: 'text-[#FF6D5A]', border: 'border-[#FF6D5A]', icon: Split };
  }
  if (clean.includes('telegram')) {
    return { name: 'Telegram', bg: 'bg-[#0088CC]', text: 'text-[#0088CC]', border: 'border-[#0088CC]', icon: Send };
  }
  if (clean.includes('schedule') || clean.includes('cron')) {
    return { name: 'Schedule', bg: 'bg-[#8B5CF6]', text: 'text-[#8B5CF6]', border: 'border-[#8B5CF6]', icon: Clock };
  }
  return { name: 'Webhook / API', bg: 'bg-[#0284C7]', text: 'text-[#0284C7]', border: 'border-[#0284C7]', icon: Globe };
}

const FRIENDLY_VARIABLES = [
  { label: '💰 Payment Amount', value: '={{ Number($json.data.object.amount) / 100 }}', preview: '$500.00' },
  { label: '👤 Customer Name', value: '={{ $json.name || $json.data?.object?.customer_details?.name || "Alex Johnson" }}', preview: 'Alex Johnson' },
  { label: '✉️ Customer Email', value: '={{ $json.email || $json.data?.object?.customer_details?.email || "customer@example.com" }}', preview: 'alex@example.com' },
  { label: '🆔 Transaction ID', value: '={{ $json.id || $json.data?.object?.id || "ch_3N8k2s..." }}', preview: 'ch_3N8k2s...' },
  { label: '📅 Today\'s Date', value: '={{ $now.toFormat("yyyy-MM-dd") }}', preview: new Date().toISOString().split('T')[0] },
  { label: '⏱️ Time', value: '={{ $now.toFormat("HH:mm:ss") }}', preview: '14:30:00' },
];

export function NodeInspectorModal({
  node,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: NodeInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings' | 'preview'>('parameters');
  const [label, setLabel] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [copiedPill, setCopiedPill] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    if (node) {
      setLabel(node.label || '');
      setConfig(node.config ? { ...node.config } : {});
      setActiveTab('parameters');
      setIsEditingTitle(false);
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const brand = getNodeBrandInfo(node.type);
  const cleanType = node.type.replace(/^n8n-nodes-base\./, '');
  const lowerType = cleanType.toLowerCase();

  const isIf = lowerType.includes('if') || lowerType.includes('filter');
  const isSlack = lowerType.includes('slack') || lowerType.includes('telegram') || lowerType.includes('discord');
  const isEmail = lowerType.includes('email') || lowerType.includes('gmail');
  const isSheets = lowerType.includes('sheet') || lowerType.includes('google');
  const isHttp = lowerType.includes('http') || lowerType.includes('webhook') || lowerType.includes('api');

  const handleConfigChange = (key: string, value: unknown) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    onUpdate(node.id, updated, label);
  };

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    onUpdate(node.id, config, newLabel);
  };

  const handleInsertVariable = (variableValue: string, targetField: string) => {
    const currentVal = String(config[targetField] || '');
    const newVal = currentVal ? `${currentVal} ${variableValue}` : variableValue;
    handleConfigChange(targetField, newVal);
    setCopiedPill(variableValue);
    setTimeout(() => setCopiedPill(null), 1500);
  };

  const continueOnFail = Boolean(config.continueOnFail);

  // Generate live preview text for preview tab
  const getSimulatedMessage = (templateStr: string) => {
    let result = templateStr || '';
    if (result.startsWith('=')) result = result.slice(1);
    result = result.replace(/\{\{\s*Number\(\$json\.data\.object\.amount\)\s*\/\s*100\s*\}\}/g, '$500.00');
    result = result.replace(/\{\{.*?customer_details\?\.email.*?\}\}/g, 'alex@example.com');
    result = result.replace(/\{\{.*?id.*?\}\}/g, 'ch_3N8k2s49921');
    result = result.replace(/\{\{.*?\$now.*?\}\}/g, new Date().toLocaleDateString());
    result = result.replace(/\{\{.*?\}\}/g, '[Value]');
    return result;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Card — n8n Workbench Style */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Branded Icon */}
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${brand.bg} text-white shadow-md`}>
              <brand.icon className="h-5 w-5" />
            </div>

            {/* Title & App Name */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={label}
                    autoFocus
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    className="text-base font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="group flex items-center gap-1.5 text-left text-base font-extrabold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <span className="truncate">{label || brand.name}</span>
                    <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                  </button>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {node.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {brand.name} • Click title to rename step
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation (Parameters, Reliability, Preview) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 gap-6">
          <button
            onClick={() => setActiveTab('parameters')}
            className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'parameters'
                ? 'border-[#ff6d5a] text-[#ff6d5a]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Step Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#ff6d5a] text-[#ff6d5a]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Reliability & Errors</span>
            {continueOnFail && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'border-[#ff6d5a] text-[#ff6d5a]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>Live Output Preview</span>
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PARAMETERS */}
          {activeTab === 'parameters' && (
            <div className="space-y-6">
              {/* Magic Variable Insert Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Insert Live Data from Previous Steps</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                  Click any button to automatically insert real workflow data without writing code:
                </p>
                <div className="flex flex-wrap gap-2">
                  {FRIENDLY_VARIABLES.map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() =>
                        handleInsertVariable(
                          v.value,
                          isSlack ? 'message' : isEmail ? 'body' : isIf ? 'expression' : 'value'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#ff6d5a] hover:text-[#ff6d5a] shadow-sm transition-all cursor-pointer"
                    >
                      <span>{v.label}</span>
                      {copiedPill === v.value && <Check className="h-3 w-3 text-emerald-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Slack / Discord / Telegram Settings ── */}
              {isSlack && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Destination Channel or Chat
                    </label>
                    <input
                      type="text"
                      value={String(config.channel || '')}
                      onChange={(e) => handleConfigChange('channel', e.target.value)}
                      placeholder="e.g. #sales-alerts, #general, or @team"
                      className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      The Slack/Discord channel where this message will be delivered.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Message Text
                    </label>
                    <textarea
                      rows={5}
                      value={String(config.message || config.text || '')}
                      onChange={(e) => handleConfigChange('message', e.target.value)}
                      placeholder="e.g. 🎉 New Payment Received! Customer: {{ $json.customer.email }}..."
                      className="w-full text-xs font-mono leading-relaxed p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                    />
                  </div>
                </div>
              )}

              {/* ── Email / Gmail Settings ── */}
              {isEmail && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Send Email To (Recipient)
                    </label>
                    <input
                      type="text"
                      value={String(config.to || '')}
                      onChange={(e) => handleConfigChange('to', e.target.value)}
                      placeholder="customer@example.com or click [ ✉️ Customer Email ] above"
                      className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      value={String(config.subject || '')}
                      onChange={(e) => handleConfigChange('subject', e.target.value)}
                      placeholder="e.g. Your Payment Receipt from Qonace"
                      className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Email Body Content
                    </label>
                    <textarea
                      rows={5}
                      value={String(config.body || config.message || '')}
                      onChange={(e) => handleConfigChange('body', e.target.value)}
                      placeholder="e.g. Hello! Here is confirmation of your recent payment..."
                      className="w-full text-xs font-mono leading-relaxed p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                    />
                  </div>
                </div>
              )}

              {/* ── Google Sheets Settings ── */}
              {isSheets && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Spreadsheet Document ID or Link
                    </label>
                    <input
                      type="text"
                      value={String(config.spreadsheetId || '')}
                      onChange={(e) => handleConfigChange('spreadsheetId', e.target.value)}
                      placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                      className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Copy the ID from your Google Sheets URL (the long code between /d/ and /edit).
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        Sheet Tab Name
                      </label>
                      <input
                        type="text"
                        value={String(config.sheetName || 'Sheet1')}
                        onChange={(e) => handleConfigChange('sheetName', e.target.value)}
                        placeholder="Sheet1"
                        className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        Action to Perform
                      </label>
                      <select
                        value={String(config.operation || 'appendRow')}
                        onChange={(e) => handleConfigChange('operation', e.target.value)}
                        className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                      >
                        <option value="appendRow">➕ Add a new row to bottom</option>
                        <option value="read">🔍 Read rows</option>
                        <option value="update">✏️ Update an existing row</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Multi-Branch If Condition (Non-Technical Sentence Builder) ── */}
              {isIf && (
                <div className="space-y-4 p-5 rounded-2xl border-2 border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/20">
                  <div className="flex items-center gap-2">
                    <Split className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Conditional Routing Rule
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Route your workflow down different paths based on incoming data.
                      </p>
                    </div>
                  </div>

                  {/* Plain English Sentence Builder */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        1. When this value:
                      </label>
                      <input
                        type="text"
                        value={String(config.expression || config.value1 || '')}
                        onChange={(e) => handleConfigChange('expression', e.target.value)}
                        placeholder="e.g. {{ Number($json.data.object.amount) / 100 }}"
                        className="w-full text-xs font-mono p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          2. Meets this rule:
                        </label>
                        <select
                          value={String(config.operation || 'larger')}
                          onChange={(e) => handleConfigChange('operation', e.target.value)}
                          className="w-full text-xs font-medium p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                          <option value="larger">is greater than (&gt;)</option>
                          <option value="largerEqual">is greater than or equal (&gt;=)</option>
                          <option value="smaller">is less than (&lt;)</option>
                          <option value="smallerEqual">is less than or equal (&lt;=)</option>
                          <option value="equal">is exactly equal to (=)</option>
                          <option value="notEqual">is not equal to (!=)</option>
                          <option value="contains">contains text</option>
                          <option value="notEmpty">has any value (is not empty)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          3. Compare against:
                        </label>
                        <input
                          type="text"
                          value={String(config.value2 ?? config.threshold ?? '500')}
                          onChange={(e) => handleConfigChange('value2', e.target.value)}
                          placeholder="500"
                          className="w-full text-xs font-mono p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visual Outcome Explanation */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 mb-0.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>✓ IF YES (True Branch)</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Workflow executes the top branch (e.g. VIP alert or high priority).
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300 mb-0.5">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        <span>✗ IF NO (False Branch)</span>
                      </div>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400">
                        Workflow executes the fallback branch (e.g. standard email or logging).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Webhook / HTTP Request Settings ── */}
              {isHttp && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        HTTP Method
                      </label>
                      <select
                        value={String(config.method || config.httpMethod || 'POST')}
                        onChange={(e) => handleConfigChange('method', e.target.value)}
                        className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                      >
                        <option value="POST">POST</option>
                        <option value="GET">GET</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        API Endpoint URL
                      </label>
                      <input
                        type="text"
                        value={String(config.url || config.path || '')}
                        onChange={(e) => handleConfigChange('url', e.target.value)}
                        placeholder="https://api.yourcompany.com/webhook"
                        className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RELIABILITY & SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Error Protection Toggle Card */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Never Stop Workflow on Error
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    If this service experiences a temporary hiccup (like a 3rd-party outage or rate limit), Qonace will safely log the event and continue running the rest of your automation without crashing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleConfigChange('continueOnFail', !continueOnFail)}
                  className="mt-1 text-slate-400 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                >
                  {continueOnFail ? (
                    <ToggleRight className="h-8 w-8 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  )}
                </button>
              </div>

              {/* Personal Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Step Notes (For your reference)
                </label>
                <textarea
                  rows={3}
                  value={String(config.notes || '')}
                  onChange={(e) => handleConfigChange('notes', e.target.value)}
                  placeholder="e.g. This notification alerts the VIP account manager whenever an invoice over $500 is paid."
                  className="w-full text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6d5a]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: LIVE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Real-time Output Preview
                </h4>
                <span className="text-[10px] text-slate-400 font-medium">
                  Sample data simulated live
                </span>
              </div>

              {isSlack && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white font-sans space-y-2 border border-slate-800 shadow-md">
                  <div className="flex items-center gap-2 text-xs text-slate-400 border-b border-slate-800 pb-2">
                    <span className="font-bold text-white"># {String(config.channel || 'general')}</span>
                    <span>•</span>
                    <span>Qonace Bot [APP]</span>
                    <span>•</span>
                    <span>Just now</span>
                  </div>
                  <div className="text-xs leading-relaxed font-mono whitespace-pre-wrap text-slate-200">
                    {getSimulatedMessage(String(config.message || 'No message template configured yet.'))}
                  </div>
                </div>
              )}

              {isEmail && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3 shadow-md">
                  <div className="text-xs text-slate-500 space-y-1 border-b border-slate-100 dark:border-slate-700 pb-2">
                    <div><span className="font-bold text-slate-700 dark:text-slate-300">To:</span> {String(config.to || 'customer@example.com')}</div>
                    <div><span className="font-bold text-slate-700 dark:text-slate-300">Subject:</span> {String(config.subject || 'Automated Notification')}</div>
                  </div>
                  <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200 font-sans">
                    {getSimulatedMessage(String(config.body || config.message || 'Your email message will appear here.'))}
                  </div>
                </div>
              )}

              {isIf && (
                <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 space-y-2">
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-300">Decision Rule Test:</span>
                  <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
                    IF Amount ($500.00) {String(config.operation || '>')} {String(config.value2 || '500')}
                  </div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    ➔ Outcome: TRUE (Proceeds to primary branch)
                  </div>
                </div>
              )}

              {!isSlack && !isEmail && !isIf && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-mono">
                  {JSON.stringify(config, null, 2)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between">
          <div>
            {onDelete && (
              <button
                onClick={() => onDelete(node.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Step</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-[#ff6d5a] hover:bg-[#e85b49] rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Save & Update Canvas</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
