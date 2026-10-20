import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  Check,
  Split,
  MessageSquare,
  Mail,
  Table,
  Globe,
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

interface NodeInspectorDrawerProps {
  node: GraphNodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, newConfig: Record<string, unknown>, newLabel?: string) => void;
  onDelete?: (nodeId: string) => void;
}

export function NodeInspectorDrawer({
  node,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: NodeInspectorDrawerProps) {
  const [label, setLabel] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [copiedPill, setCopiedPill] = useState<string | null>(null);

  useEffect(() => {
    if (node) {
      setLabel(node.label || '');
      setConfig(node.config ? { ...node.config } : {});
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const cleanType = node.type.startsWith('n8n-nodes-base.')
    ? node.type.replace('n8n-nodes-base.', '')
    : node.type;
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

  const handleAddCustomParam = () => {
    if (!newKey.trim()) return;
    const updated = { ...config, [newKey.trim()]: newValue };
    setConfig(updated);
    onUpdate(node.id, updated, label);
    setNewKey('');
    setNewValue('');
  };

  const handleRemoveCustomParam = (key: string) => {
    const updated = { ...config };
    delete updated[key];
    setConfig(updated);
    onUpdate(node.id, updated, label);
  };

  const handleInsertTag = (tag: string, targetField: string) => {
    const currentVal = String(config[targetField] || '');
    const newVal = currentVal ? `${currentVal} ${tag}` : tag;
    handleConfigChange(targetField, newVal);
    setCopiedPill(tag);
    setTimeout(() => setCopiedPill(null), 1500);
  };

  const continueOnFail = Boolean(config.continueOnFail);

  return (
    <aside className="absolute right-0 top-0 bottom-0 w-84 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 shadow-2xl z-30 flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
            {isIf ? (
              <Split className="h-4 w-4" />
            ) : isSlack ? (
              <MessageSquare className="h-4 w-4" />
            ) : isEmail ? (
              <Mail className="h-4 w-4" />
            ) : isSheets ? (
              <Table className="h-4 w-4" />
            ) : isHttp ? (
              <Globe className="h-4 w-4" />
            ) : (
              <Sliders className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {cleanType}
            </span>
            <div className="text-xs text-slate-400 font-mono">ID: {node.id}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close Inspector"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Step Name / Label */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
            Step Name / Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="e.g. Notify VIP Slack"
          />
        </div>

        {/* Dynamic Expression Quick Helpers */}
        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mb-2">
            <Sparkles className="h-3 w-3 text-indigo-500" />
            <span>Dynamic Expression Helpers</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">
            Click any tag to append it into your message or expression:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              '={{ $json.data.object.amount / 100 }}',
              '={{ $json.customer.email }}',
              '={{ $json.name }}',
              '={{ $now.toFormat("yyyy-MM-dd") }}',
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  handleInsertTag(
                    tag,
                    isSlack ? 'message' : isEmail ? 'body' : isIf ? 'expression' : 'value'
                  )
                }
                className="text-[9px] font-mono px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
              >
                {copiedPill === tag ? '✓ Added' : tag}
              </button>
            ))}
          </div>
        </div>

        {/* ── Specialized Node Type Controls ── */}

        {/* If Condition Editor */}
        {isIf && (
          <div className="space-y-3 p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/40 dark:bg-teal-950/20">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-300">
              <Split className="h-3.5 w-3.5 text-teal-600" />
              <span>Multi-Branch Conditional Rules</span>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Value to Evaluate (Expression or Field)
              </label>
              <input
                type="text"
                value={String(config.expression || config.value1 || '')}
                onChange={(e) => handleConfigChange('expression', e.target.value)}
                placeholder="={{ Number($json.data.object.amount) / 100 }}"
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Operator
                </label>
                <select
                  value={String(config.operation || 'larger')}
                  onChange={(e) => handleConfigChange('operation', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="larger">Larger than (&gt;)</option>
                  <option value="largerEqual">Larger or equal (&gt;=)</option>
                  <option value="smaller">Smaller than (&lt;)</option>
                  <option value="smallerEqual">Smaller or equal (&lt;=)</option>
                  <option value="equal">Equal to (==)</option>
                  <option value="notEqual">Not equal to (!=)</option>
                  <option value="contains">Contains text</option>
                  <option value="notEmpty">Not empty</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Threshold / Compare Value
                </label>
                <input
                  type="text"
                  value={String(config.value2 ?? config.threshold ?? '500')}
                  onChange={(e) => handleConfigChange('value2', e.target.value)}
                  placeholder="500"
                  className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-teal-200/60 dark:border-teal-900/40 text-[10px] space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Output 1 (True Branch): Triggers when condition passes</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Output 2 (False Branch): Triggers otherwise / fallback</span>
              </div>
            </div>
          </div>
        )}

        {/* Slack / Telegram / Discord Controls */}
        {isSlack && (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Channel / Recipient
              </label>
              <input
                type="text"
                value={String(config.channel || '')}
                onChange={(e) => handleConfigChange('channel', e.target.value)}
                placeholder="#general or @channel"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Notification Message Template
              </label>
              <textarea
                rows={4}
                value={String(config.message || config.text || '')}
                onChange={(e) => handleConfigChange('message', e.target.value)}
                placeholder="=New payment of ${{ $json.amount }}"
                className="w-full text-xs font-mono px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Email Controls */}
        {isEmail && (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                To (Recipient Email or Expression)
              </label>
              <input
                type="text"
                value={String(config.to || '')}
                onChange={(e) => handleConfigChange('to', e.target.value)}
                placeholder="customer@example.com or ={{ $json.email }}"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={String(config.subject || '')}
                onChange={(e) => handleConfigChange('subject', e.target.value)}
                placeholder="=Payment Receipt for ${{ $json.amount }}"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Email Body Text
              </label>
              <textarea
                rows={4}
                value={String(config.body || config.message || '')}
                onChange={(e) => handleConfigChange('body', e.target.value)}
                placeholder="=Hello {{ $json.customer.name }}, here is your confirmation..."
                className="w-full text-xs font-mono px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Google Sheets Controls */}
        {isSheets && (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Spreadsheet ID
              </label>
              <input
                type="text"
                value={String(config.spreadsheetId || '')}
                onChange={(e) => handleConfigChange('spreadsheetId', e.target.value)}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Sheet Name
                </label>
                <input
                  type="text"
                  value={String(config.sheetName || 'Sheet1')}
                  onChange={(e) => handleConfigChange('sheetName', e.target.value)}
                  placeholder="Sheet1"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Operation
                </label>
                <select
                  value={String(config.operation || 'appendRow')}
                  onChange={(e) => handleConfigChange('operation', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="appendRow">Append Row</option>
                  <option value="read">Read Rows</option>
                  <option value="update">Update Row</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* HTTP Request / Webhook Controls */}
        {isHttp && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Method
                </label>
                <select
                  value={String(config.method || config.httpMethod || 'POST')}
                  onChange={(e) => handleConfigChange('method', e.target.value)}
                  className="w-full text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  URL / Path
                </label>
                <input
                  type="text"
                  value={String(config.url || config.path || '')}
                  onChange={(e) => handleConfigChange('url', e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Resilience: Continue on Fail */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                Continue on Fail
              </span>
              <p className="text-[10px] text-slate-400 leading-tight">
                Prevents execution stop if transient errors occur
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleConfigChange('continueOnFail', !continueOnFail)}
              className="text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity cursor-pointer"
            >
              {continueOnFail ? (
                <ToggleRight className="h-6 w-6 text-emerald-500" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Custom Parameters Section */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            Custom Parameters
          </label>
          <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
            {Object.entries(config)
              .filter(
                ([k]) =>
                  ![
                    'channel',
                    'message',
                    'text',
                    'to',
                    'subject',
                    'body',
                    'spreadsheetId',
                    'sheetName',
                    'operation',
                    'expression',
                    'value1',
                    'value2',
                    'threshold',
                    'continueOnFail',
                  ].includes(k)
              )
              .map(([k, v]) => (
                <div key={k} className="flex items-center gap-1 text-xs">
                  <span className="w-24 shrink-0 font-mono text-[10px] text-slate-400 truncate">
                    {k}:
                  </span>
                  <input
                    type="text"
                    value={typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
                    onChange={(e) => handleConfigChange(k, e.target.value)}
                    className="flex-1 text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                  <button
                    onClick={() => handleRemoveCustomParam(k)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                    title="Remove parameter"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-24 text-[11px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
            />
            <input
              type="text"
              placeholder="Value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="flex-1 text-[11px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
            />
            <button
              onClick={handleAddCustomParam}
              disabled={!newKey.trim()}
              className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
          <Check className="h-3 w-3" />
          <span>Auto-synced to canvas</span>
        </div>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              onClick={() => onDelete(node.id)}
              className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
            >
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </aside>
  );
}
