import { InternalGraphSchema } from './internal-graph.js';
import type { InternalGraph, GraphValidationError } from './internal-graph.js';

export type ValidationMode = 'draft' | 'complete';

export function validateInternalGraph(
  graph: InternalGraph,
  mode: ValidationMode = 'complete',
): { valid: boolean; errors: GraphValidationError[] } {
  const errors: GraphValidationError[] = [];
  const sev = (s: 'error' | 'warning') => mode === 'complete' ? s : 'warning';
  const parsed = InternalGraphSchema.safeParse(graph);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({ path: issue.path.join('.'), message: issue.message, severity: sev('error') });
    }
    if (mode === 'draft') return { valid: true, errors };
    return { valid: false, errors };
  }
  const wf = parsed.data;
  if (wf.nodes.length === 0) {
    errors.push({ path: 'nodes', message: 'Graph has no nodes', severity: sev('error') });
    if (mode === 'draft') return { valid: true, errors };
  }
  const nodeIds = new Set(wf.nodes.map((n) => n.id));
  for (const edge of wf.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push({ path: 'edges.' + edge.id + '.source', message: '"Source node "' + edge.source + '" does not exist"', severity: sev('error') });
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({ path: 'edges.' + edge.id + '.target', message: '"Target node "' + edge.target + '" does not exist"', severity: sev('error') });
    }
  }
  if (mode === 'draft') {
    for (const node of wf.nodes) {
      const connected = wf.edges.some((ed) => ed.source === node.id);
      if (!connected) {
        errors.push({ path: 'nodes.' + node.id + '', message: 'Node ' + node.label + ' is not connected', severity: 'warning' });
      }
    }
    return { valid: true, errors };
  }
  const connectedSources = new Set(wf.edges.map((ed) => ed.source));
  for (const node of wf.nodes) {
    if (!connectedSources.has(node.id)) {
      errors.push({ path: 'nodes.'+node.id+'', message: 'Node '+node.label+' is not connected to any downstream node', severity: 'warning' });
    }
  }
  const hasSource = wf.nodes.some((n) => !wf.edges.some((ed) => ed.target === n.id));
  const hasSink = wf.nodes.some((n) => !wf.edges.some((ed) => ed.source === n.id));
  if (!hasSource && wf.nodes.length > 0) errors.push({ path: 'edges', message: 'No entry nodes detected', severity: 'warning' });
  if (!hasSink && wf.nodes.length > 0) errors.push({ path: 'edges', message: 'No exit nodes detected', severity: 'warning' });
  return { valid: errors.filter((e) => e.severity === 'error').length === 0, errors };
}

export function createEmptyGraph(name: string, description?: string): InternalGraph {
  return InternalGraphSchema.parse({ metadata: { name, description: description ?? '' }, nodes: [], edges: [] });
}
