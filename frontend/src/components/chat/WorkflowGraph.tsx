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
import { NodeInspectorModal, getNodeBrandInfo, type GraphNodeData } from './NodeInspectorModal';

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
      const brand = getNodeBrandInfo(wfNode.type);
      const isSelected = activeSelectedId === wfNode.id;
      const isIf = (wfNode.type || '').toLowerCase().includes('if') || (wfNode.type || '').toLowerCase() === 'filter';

      // Non-technical human summary for the node subtitle
      let friendlySubtitle = wfNode.description || '';
      if (!friendlySubtitle || friendlySubtitle === 'Action step') {
        if (isIf) {
          friendlySubtitle = wfNode.config?.value2 ? `Rule: Greater than ${wfNode.config.value2}` : 'Decision: If / Else';
        } else if (brand.name === 'Slack') {
          friendlySubtitle = wfNode.config?.channel ? `Posts to ${wfNode.config.channel}` : 'Sends Slack message';
        } else if (brand.name.includes('Email')) {
          friendlySubtitle = wfNode.config?.to ? `Email to ${wfNode.config.to}` : 'Sends email notification';
        } else if (brand.name.includes('Sheets')) {
          friendlySubtitle = wfNode.config?.sheetName ? `Appends to ${wfNode.config.sheetName}` : 'Logs row in Google Sheets';
        } else if (brand.name === 'Stripe') {
          friendlySubtitle = 'Trigger: When payment succeeds';
        } else if (brand.name === 'Schedule') {
          friendlySubtitle = 'Trigger: Scheduled timer';
        } else {
          friendlySubtitle = 'Automated step';
        }
      }

      rfNodes.push({
        id: wfNode.id,
        type: 'default',
        position: { x: wfNode.position.x, y: wfNode.position.y },
        style: {
          borderWidth: 0,
          background: 'transparent',
          padding: 0,
          fontSize: 12,
          minWidth: 230,
          boxShadow: 'none',
        },
        data: {
          label: (
            <div
              className={`relative flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 cursor-pointer select-none shadow-md ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-2 border-[#ff6d5a] ring-4 ring-[#ff6d5a]/20 shadow-2xl scale-[1.03]'
                  : 'bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 hover:scale-[1.01]'
              }`}
            >
              {/* Left n8n Branded App Icon Badge */}
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${brand.bg} text-white shadow-sm`}
              >
                <brand.icon className="h-5 w-5" />
              </div>

              {/* Center Info */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">
                    {brand.name}
                  </span>
                  {isSelected ? (
                    <span className="text-[9px] font-bold text-[#ff6d5a] bg-orange-50 dark:bg-orange-950/60 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                      <Pencil className="h-2 w-2" />
                      Edit
                    </span>
                  ) : (
                    <span className="text-[8px] font-mono text-slate-400 shrink-0">
                      {wfNode.id}
                    </span>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                  {wfNode.label}
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {friendlySubtitle}
                </div>
              </div>

              {/* If Condition Port Indicators on Right */}
              {isIf && (
                <div className="absolute -right-1.5 top-0 bottom-0 flex flex-col justify-between py-2 pointer-events-none">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-sm" title="True Branch" />
                  <span className="h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 shadow-sm" title="False Branch" />
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
          stroke: isTrueBranch ? '#10b981' : isFalseBranch ? '#f43f5e' : '#94a3b8',
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

          {/* n8n-Style Node Configuration Workbench Modal */}
          <NodeInspectorModal
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
