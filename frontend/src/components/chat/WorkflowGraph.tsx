import { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Pencil } from 'lucide-react';
import { NodeInspectorDrawer, type GraphNodeData } from './NodeInspectorDrawer';

interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
}

interface WorkflowGraphProps {
  graph: {
    metadata?: { name?: string };
    nodes?: GraphNodeData[];
    edges?: GraphEdgeData[];
  };
  className?: string;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  onUpdateNodeConfig?: (nodeId: string, newConfig: Record<string, unknown>, newLabel?: string) => void;
  onDeleteNode?: (nodeId: string) => void;
}

const TRIGGER_TYPES = ['webhook', 'schedule', 'cron', 'manual', 'form_submission', 'email_received', 'payment_received'];

function getNodeStyle(nodeType: string): { border: string; bg: string; dot: string } {
  const cleanType = nodeType.startsWith('n8n-nodes-base.') ? nodeType.replace('n8n-nodes-base.', '') : nodeType;
  const lower = cleanType.toLowerCase();

  const isTrigger = TRIGGER_TYPES.some((t) => lower.includes(t)) || lower.includes('trigger') || lower.includes('webhook') || lower.includes('cron') || lower.includes('schedule');

  if (isTrigger) {
    return {
      border: 'border border-amber-300 ring-2 ring-amber-50/30 dark:border-amber-700/60 dark:ring-amber-950/30',
      bg: 'bg-gradient-to-br from-amber-50/95 to-amber-100/50 dark:from-amber-950/40 dark:to-slate-900 backdrop-blur-sm',
      dot: 'bg-amber-500',
    };
  }
  if (lower.includes('email') || lower.includes('gmail')) {
    return {
      border: 'border border-sky-300 ring-2 ring-sky-50/30 dark:border-sky-700/60 dark:ring-sky-950/30',
      bg: 'bg-gradient-to-br from-sky-50/95 to-sky-100/50 dark:from-sky-950/40 dark:to-slate-900 backdrop-blur-sm',
      dot: 'bg-sky-500',
    };
  }
  if (lower.includes('http') || lower.includes('request')) {
    return {
      border: 'border border-indigo-300 ring-2 ring-indigo-50/30 dark:border-indigo-700/60 dark:ring-indigo-950/30',
      bg: 'bg-gradient-to-br from-indigo-50/95 to-indigo-100/50 dark:from-indigo-950/40 dark:to-slate-900 backdrop-blur-sm',
      dot: 'bg-indigo-500',
    };
  }
  if (lower.includes('filter') || lower.includes('if')) {
    return {
      border: 'border border-teal-300 ring-2 ring-teal-50/30 dark:border-teal-700/60 dark:ring-teal-950/30',
      bg: 'bg-gradient-to-br from-teal-50/95 to-teal-100/50 dark:from-teal-950/40 dark:to-slate-900 backdrop-blur-sm',
      dot: 'bg-teal-500',
    };
  }
  if (lower.includes('transform') || lower.includes('set') || lower.includes('merge')) {
    return {
      border: 'border border-violet-300 ring-2 ring-violet-50/30 dark:border-violet-700/60 dark:ring-violet-950/30',
      bg: 'bg-gradient-to-br from-violet-50/95 to-violet-100/50 dark:from-violet-950/40 dark:to-slate-900 backdrop-blur-sm',
      dot: 'bg-violet-500',
    };
  }
  if (lower.includes('delay') || lower.includes('wait')) {
    return {
      border: 'border border-gray-300 ring-2 ring-gray-50/30 dark:border-gray-700/60 dark:ring-gray-950/30',
      bg: 'bg-gradient-to-br from-gray-50/95 to-gray-100/50 dark:from-gray-950/40 dark:to-slate-900 backdrop-blur-sm',
      dot: 'bg-gray-400',
    };
  }
  if (lower.includes('code') || lower.includes('js') || lower.includes('run')) {
    return {
      border: 'border border-fuchsia-300 ring-2 ring-fuchsia-50/30 dark:border-fuchsia-700/60 dark:ring-fuchsia-950/30',
      bg: 'bg-gradient-to-br from-fuchsia-50/95 to-fuchsia-100/50 dark:from-fuchsia-950/40 dark:to-slate-900 backdrop-blur-sm',
      dot: 'bg-fuchsia-500',
    };
  }
  if (lower.includes('sheet') || lower.includes('google')) {
    return {
      border: 'border border-emerald-300 ring-2 ring-emerald-50/30 dark:border-emerald-700/60 dark:ring-emerald-950/30',
      bg: 'bg-gradient-to-br from-emerald-50/95 to-emerald-100/50 dark:from-emerald-950/40 dark:to-slate-900 backdrop-blur-sm',
      dot: 'bg-emerald-500',
    };
  }
  if (lower.includes('slack') || lower.includes('telegram') || lower.includes('discord')) {
    return {
      border: 'border border-purple-300 ring-2 ring-purple-50/30 dark:border-purple-700/60 dark:ring-purple-950/30',
      bg: 'bg-gradient-to-br from-purple-50/95 to-purple-100/50 dark:from-purple-950/40 dark:to-slate-900 backdrop-blur-sm',
      dot: 'bg-purple-500',
    };
  }
  if (lower.includes('supabase') || lower.includes('database') || lower.includes('postgres') || lower.includes('sql')) {
    return {
      border: 'border border-emerald-400 ring-2 ring-emerald-50/30 dark:border-emerald-700/60 dark:ring-emerald-950/30',
      bg: 'bg-gradient-to-br from-emerald-50/95 to-emerald-100/50 dark:from-emerald-950/40 dark:to-slate-900 backdrop-blur-sm',
      dot: 'bg-emerald-600',
    };
  }
  return {
    border: 'border border-blue-300 ring-2 ring-blue-50/30 dark:border-blue-700/60 dark:ring-blue-950/30',
    bg: 'bg-gradient-to-br from-blue-50/95 to-blue-100/50 dark:from-blue-950/40 dark:to-slate-900 backdrop-blur-sm',
    dot: 'bg-blue-500',
  };
}

export default function WorkflowGraph({
  graph,
  className,
  selectedNodeId: externalSelectedId,
  onSelectNode: externalOnSelect,
  onUpdateNodeConfig,
  onDeleteNode,
}: WorkflowGraphProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

  const activeSelectedId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;
  const handleSelectNode = (id: string | null) => {
    if (externalOnSelect) {
      externalOnSelect(id);
    } else {
      setInternalSelectedId(id);
    }
  };

  const selectedNodeObj = useMemo(() => {
    if (!activeSelectedId) return null;
    return (graph.nodes ?? []).find((n) => n.id === activeSelectedId) ?? null;
  }, [graph.nodes, activeSelectedId]);

  const { nodes, edges } = useMemo(() => {
    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];
    const nodeList = graph.nodes ?? [];
    const edgeList = graph.edges ?? [];

    for (const wfNode of nodeList) {
      const style = getNodeStyle(wfNode.type);
      const cleanType = wfNode.type.startsWith('n8n-nodes-base.')
        ? wfNode.type.replace('n8n-nodes-base.', '')
        : wfNode.type;

      const isSelected = activeSelectedId === wfNode.id;

      rfNodes.push({
        id: wfNode.id,
        type: 'default',
        position: { x: wfNode.position.x, y: wfNode.position.y },
        style: {
          borderWidth: 0,
          background: 'transparent',
          padding: 0,
          fontSize: 12,
          minWidth: 195,
          boxShadow: 'none',
        },
        data: {
          label: (
            <div
              className={`p-3.5 rounded-xl transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-2 border-indigo-500 ring-4 ring-indigo-500/20 shadow-2xl scale-[1.04] bg-white dark:bg-slate-900'
                  : `${style.border} ${style.bg} shadow-md hover:shadow-lg hover:scale-[1.02]`
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`h-2 w-2 rounded-full ${style.dot} animate-pulse shrink-0`} />
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase truncate max-w-[110px]">
                    {cleanType}
                  </span>
                </div>
                {isSelected ? (
                  <span className="text-[9px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 shadow-sm">
                    <Pencil className="h-2 w-2" />
                    Edit
                  </span>
                ) : (
                  <span className="text-[8px] font-mono text-gray-400 shrink-0">
                    {wfNode.id}
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs font-bold text-gray-900 dark:text-white truncate">
                {wfNode.label}
              </div>
              {wfNode.config && Object.keys(wfNode.config).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200/50 dark:border-slate-800/60 space-y-1">
                  {Object.entries(wfNode.config)
                    .filter(
                      ([, v]) =>
                        v !== undefined &&
                        v !== null &&
                        v !== '' &&
                        !(typeof v === 'object' && Object.keys(v).length === 0)
                    )
                    .slice(0, 3)
                    .map(([k, v]) => (
                      <div key={k} className="flex flex-col text-[10px] leading-tight text-gray-600 dark:text-gray-300">
                        <span className="font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[8px]">
                          {k}
                        </span>
                        <span className="truncate font-medium mt-0.5 bg-white/70 dark:bg-slate-800/80 px-1 py-0.5 rounded border border-gray-100/60 dark:border-slate-700/50">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ),
        },
      });
    }

    for (const edge of edgeList) {
      const lowerLabel = (edge.label ?? '').toLowerCase().trim();
      const isTrueBranch = lowerLabel === 'true' || lowerLabel === 'yes';
      const isFalseBranch = lowerLabel === 'false' || lowerLabel === 'no' || lowerLabel === 'else';

      rfEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: isTrueBranch ? '#10b981' : isFalseBranch ? '#f43f5e' : '#9ca3af',
          strokeWidth: isTrueBranch || isFalseBranch ? 2.5 : 2,
        },
        label: isTrueBranch
          ? '✓ True'
          : isFalseBranch
          ? '✗ False'
          : edge.label || undefined,
        labelStyle: isTrueBranch
          ? { fill: '#047857', fontWeight: 700, fontSize: 11 }
          : isFalseBranch
          ? { fill: '#be123c', fontWeight: 700, fontSize: 11 }
          : { fill: '#4b5563', fontWeight: 600, fontSize: 10 },
        labelBgStyle: isTrueBranch
          ? { fill: '#ecfdf5', stroke: '#a7f3d0', strokeWidth: 1, rx: 6, ry: 6 }
          : isFalseBranch
          ? { fill: '#fff1f2', stroke: '#fecdd3', strokeWidth: 1, rx: 6, ry: 6 }
          : { fill: '#f3f4f6', stroke: '#e5e7eb', strokeWidth: 1, rx: 4, ry: 4 },
        labelBgPadding: [6, 4],
      });
    }

    return { nodes: rfNodes, edges: rfEdges };
  }, [graph, activeSelectedId]);

  const hasNodes = (graph.nodes?.length ?? 0) > 0;

  return (
    <div className={`w-full h-full relative overflow-hidden bg-slate-50 dark:bg-slate-950 ${className ?? ''}`}>
      {hasNodes ? (
        <>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={1.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            onNodeClick={(_event, node) => handleSelectNode(node.id)}
            onPaneClick={() => handleSelectNode(null)}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#cbd5e1" gap={24} />
            <Controls position="bottom-right" showInteractive={false} />
            <MiniMap
              position="bottom-left"
              nodeStrokeWidth={2}
              pannable
              zoomable
              style={{ border: '1px solid #cbd5e1', borderRadius: 8 }}
            />
          </ReactFlow>

          {/* Interactive Slide-Out Node Parameter Inspector Drawer */}
          <NodeInspectorDrawer
            node={selectedNodeObj}
            isOpen={Boolean(selectedNodeObj)}
            onClose={() => handleSelectNode(null)}
            onUpdate={(id, cfg, lbl) => onUpdateNodeConfig?.(id, cfg, lbl)}
            onDelete={onDeleteNode}
          />
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          Workflow preview appears here
        </div>
      )}
    </div>
  );
}
