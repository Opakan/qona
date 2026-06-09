import { validateGraph } from './graph-validator.js';
import { nodeRegistry } from './node-registry.js';
import type { InternalGraph, PlanningMissingField } from '@qona/shared';

export interface SafetyResult {
  safe: boolean;
  errors: string[];
  warnings: string[];
  shouldGoBackToClarifying: boolean;
}

export function checkWorkflowCompleteness(opts: {
  draft: InternalGraph | null;
  missingFields: PlanningMissingField[];
}): SafetyResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const unanswered = opts.missingFields.filter((f) => !f.answered);
  if (unanswered.length > 0) {
    errors.push('Unanswered fields: ' + unanswered.map((f) => f.question).join(', '));
  }

  if (!opts.draft) {
    errors.push('No workflow draft exists');
    return { safe: false, errors, warnings, shouldGoBackToClarifying: true };
  }

  if (!opts.draft.nodes || opts.draft.nodes.length === 0) {
    errors.push('Draft has no nodes');
    return { safe: false, errors, warnings, shouldGoBackToClarifying: true };
  }

  const registeredTypes = new Set(nodeRegistry.getNodeTypes());
  const validation = validateGraph(opts.draft, { registeredTypes });

  if (!validation.valid) {
    errors.push('Graph validation failed');
    for (const e of validation.errors) {
      errors.push(`[${e.type}] ${e.message}`);
    }
    return { safe: false, errors, warnings, shouldGoBackToClarifying: true };
  }

  const answered = opts.missingFields.filter((f) => f.answered);
  if (answered.length < 2) warnings.push('Very few questions answered');

  return { safe: true, errors, warnings, shouldGoBackToClarifying: false };
}

export function checkCompileReadiness(graph: InternalGraph): SafetyResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!graph.nodes || graph.nodes.length === 0) {
    errors.push('No nodes to compile');
    return { safe: false, errors, warnings, shouldGoBackToClarifying: false };
  }

  const registeredTypes = new Set(nodeRegistry.getNodeTypes());
  const validation = validateGraph(graph, { registeredTypes });

  if (!validation.valid) {
    errors.push('Graph is not ready for compilation');
    for (const e of validation.errors) {
      errors.push(`[${e.type}] ${e.message}`);
    }
    return { safe: false, errors, warnings, shouldGoBackToClarifying: false };
  }

  return { safe: true, errors, warnings, shouldGoBackToClarifying: false };
}
