import { useState } from 'react';
import { Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import apiClient from '../../api/client';

interface ExportButtonProps {
  workflowId: string;
  workflowName?: string;
}

export default function ExportButton({ workflowId, workflowName }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      const { data } = await apiClient.post(
        `/workflows/${workflowId}/export/download`,
        { platform: 'n8n' },
        { responseType: 'json' },
      );

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(workflowName ?? 'workflow').replace(/\s+/g, '_')}_n8n.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      setErrorMsg(msg);
      setStatus('error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40"
      >
        {exporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {exporting ? 'Exporting...' : 'Export n8n JSON'}
      </button>

      {status === 'success' && (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3 w-3" />
          Downloaded
        </span>
      )}
      {status === 'error' && (
        <span className="inline-flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          {errorMsg || 'Export failed'}
        </span>
      )}
    </div>
  );
}
