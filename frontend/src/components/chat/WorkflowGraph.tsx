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

function getNodeStyle(nodeType: string): { border: string; bg: string } {
  const isTrigger = TRIGGER_TYPES.some((t) => nodeType === t);
  if (isTrigger) return { border: 'border-orange-300', bg: 'bg-orange-50' };
  if (nodeType === 'send_email') return { border: 'border-blue-300', bg: 'bg-blue-50' };
  if (nodeType === 'http_request') return { border: 'border-blue-300', bg: 'bg-blue-50' };
  if (nodeType === 'filter' || nodeType === 'if') return { border: 'border-yellow-300', bg: 'bg-yellow-50' };
  if (nodeType === 'transform_data' || nodeType === 'set') return { border: 'border-purple-300', bg: 'bg-purple-50' };
  if (nodeType === 'delay' || nodeType === 'wait') return { border: 'border-gray-300', bg: 'bg-gray-50' };
  if (nodeType === 'run_code' || nodeType === 'code') return { border: 'border-pink-300', bg: 'bg-pink-50' };
  if (nodeType === 'google_sheets') return { border: 'border-green-300', bg: 'bg-green-50' };
  return { border: 'border-blue-300', bg: 'bg-blue-50' };
}

export default function WorkflowGraph({ graph, className }: WorkflowGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const rfNodes: Node[] = [];
    const rfEdges: Edge[] = [];
    const nodeList = graph.nodes ?? [];
    const edgeList = graph.edges ?? [];

    for (const wfNode of nodeList) {
      const style = getNodeStyle(wfNode.type);
      rfNodes.push({
        id: wfNode.id,
        type: 'default',
        position: { x: wfNode.position.x, y: wfNode.position.y },
        style: { borderWidth: 1, borderRadius: 8, fontSize: 12, minWidth: 160, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
        data: {
          label: (
            <div className="p-3">
              <div className="text-xs font-medium text-gray-400 uppercase">{wfNode.type}</div>
              <div className="mt-0.5 text-sm font-medium text-gray-900">{wfNode.label}</div>
              {wfNode.config && Object.keys(wfNode.config).length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {Object.entries(wfNode.config)
                    .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(typeof v === 'object' && Object.keys(v).length === 0))
                    .slice(0, 3)
                    .map(([k, v]) => (
                      <div key={k} className="text-xs text-gray-500 truncate">
                        <span className="font-medium">{k}:</span>{' '}
                        {typeof v === 'object' ? JSON.stringify(v).slice(0, 30) : String(v).slice(0, 30)}
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
        style: { stroke: '#d1d5db', strokeWidth: 2 },
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
