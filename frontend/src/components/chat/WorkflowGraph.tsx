import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface GraphNodeData {
  id: string;
  type: string;
  label: string;
  description?: string;
  position: { x: number; y: number };
  config?: Record<string, unknown>;
  connections?: string[];
}

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
}

const TRIGGER_TYPES = ['webhook', 'schedule', 'cron', 'manual', 'form_submission', 'email_received', 'payment_received'];

function getNodeStyle(nodeType: string): { border: string; bg: string; dot: string } {
  const cleanType = nodeType.startsWith('n8n-nodes-base.') ? nodeType.replace('n8n-nodes-base.', '') : nodeType;
  const lower = cleanType.toLowerCase();

  const isTrigger = TRIGGER_TYPES.some((t) => lower.includes(t)) || lower.includes('trigger') || lower.includes('webhook') || lower.includes('cron') || lower.includes('schedule');

  if (isTrigger) {
    return {
      border: 'border border-amber-300 ring-2 ring-amber-50/30',
      bg: 'bg-gradient-to-br from-amber-50/90 to-amber-100/40 backdrop-blur-sm',
      dot: 'bg-amber-500',
    };
  }
  if (lower.includes('email') || lower.includes('gmail')) {
    return {
      border: 'border border-sky-300 ring-2 ring-sky-50/30',
      bg: 'bg-gradient-to-br from-sky-50/90 to-sky-100/40 backdrop-blur-sm',
      dot: 'bg-sky-500',
    };
  }
  if (lower.includes('http') || lower.includes('request')) {
    return {
      border: 'border border-indigo-300 ring-2 ring-indigo-50/30',
      bg: 'bg-gradient-to-br from-indigo-50/90 to-indigo-100/40 backdrop-blur-sm',
      dot: 'bg-indigo-500',
    };
  }
  if (lower.includes('filter') || lower.includes('if')) {
    return {
      border: 'border border-teal-300 ring-2 ring-teal-50/30',
      bg: 'bg-gradient-to-br from-teal-50/90 to-teal-100/40 backdrop-blur-sm',
      dot: 'bg-teal-500',
    };
  }
  if (lower.includes('transform') || lower.includes('set') || lower.includes('merge')) {
    return {
      border: 'border border-violet-300 ring-2 ring-violet-50/30',
      bg: 'bg-gradient-to-br from-violet-50/90 to-violet-100/40 backdrop-blur-sm',
      dot: 'bg-violet-500',
    };
  }
  if (lower.includes('delay') || lower.includes('wait')) {
    return {
      border: 'border border-gray-300 ring-2 ring-gray-50/30',
      bg: 'bg-gradient-to-br from-gray-50/90 to-gray-100/40 backdrop-blur-sm',
      dot: 'bg-gray-450',
    };
  }
  if (lower.includes('code') || lower.includes('js') || lower.includes('run')) {
    return {
      border: 'border border-fuchsia-300 ring-2 ring-fuchsia-50/30',
      bg: 'bg-gradient-to-br from-fuchsia-50/90 to-fuchsia-100/40 backdrop-blur-sm',
      dot: 'bg-fuchsia-500',
    };
  }
  if (lower.includes('sheet') || lower.includes('google')) {
    return {
      border: 'border border-emerald-300 ring-2 ring-emerald-50/30',
      bg: 'bg-gradient-to-br from-emerald-50/90 to-emerald-100/40 backdrop-blur-sm',
      dot: 'bg-emerald-500',
    };
  }
  if (lower.includes('slack') || lower.includes('telegram') || lower.includes('discord')) {
    return {
      border: 'border border-purple-300 ring-2 ring-purple-50/30',
      bg: 'bg-gradient-to-br from-purple-50/90 to-purple-100/40 backdrop-blur-sm',
      dot: 'bg-purple-500',
    };
  }
  if (lower.includes('supabase') || lower.includes('database') || lower.includes('postgres') || lower.includes('sql')) {
    return {
      border: 'border border-emerald-400 ring-2 ring-emerald-50/30',
      bg: 'bg-gradient-to-br from-emerald-50/90 to-emerald-100/40 backdrop-blur-sm',
      dot: 'bg-emerald-600',
    };
  }
  return {
    border: 'border border-blue-300 ring-2 ring-blue-50/30',
    bg: 'bg-gradient-to-br from-blue-50/90 to-blue-100/40 backdrop-blur-sm',
    dot: 'bg-blue-500',
  };
}

export default function WorkflowGraph({ graph, className }: WorkflowGraphProps) {
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

      rfNodes.push({
        id: wfNode.id,
        type: 'default',
        position: { x: wfNode.position.x, y: wfNode.position.y },
        style: {
          borderWidth: 0,
          background: 'transparent',
          padding: 0,
          fontSize: 12,
          minWidth: 190,
          boxShadow: 'none',
        },
        data: {
          label: (
            <div className={`p-4 rounded-xl shadow-md ${style.border} ${style.bg} transition-all duration-350 hover:shadow-lg hover:scale-[1.02]`}>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${style.dot} animate-pulse`} />
                <span className="text-[10px] font-semibold text-gray-500 tracking-wider uppercase truncate max-w-[130px]">
                  {cleanType}
                </span>
              </div>
              <div className="mt-1 text-xs font-semibold text-gray-900 truncate">
                {wfNode.label}
              </div>
              {wfNode.config && Object.keys(wfNode.config).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200/50 space-y-1">
                  {Object.entries(wfNode.config)
                    .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(typeof v === 'object' && Object.keys(v).length === 0))
                    .slice(0, 3)
                    .map(([k, v]) => (
                      <div key={k} className="flex flex-col text-[10px] leading-tight text-gray-600">
                        <span className="font-semibold text-gray-400 uppercase tracking-wide text-[8px]">{k}</span>
                        <span className="truncate font-medium mt-0.5 bg-white/60 px-1 py-0.5 rounded border border-gray-100/50">
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
      rfEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#9ca3af', strokeWidth: 2 },
        label: edge.label || undefined,
      });
    }

    return { nodes: rfNodes, edges: rfEdges };
  }, [graph]);

  const hasNodes = (graph.nodes?.length ?? 0) > 0;

  return (
    <div className={`w-full h-full bg-gray-50 ${className ?? ''}`}>
      {hasNodes ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={1.5}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e5e7eb" gap={24} />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            position="bottom-left"
            nodeStrokeWidth={2}
            pannable
            zoomable
            style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}
          />
        </ReactFlow>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          Workflow preview appears here
        </div>
      )}
    </div>
  );
}
