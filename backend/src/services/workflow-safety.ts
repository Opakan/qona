import { validateInternalGraph } from '@qona/shared';
import type { InternalGraph, PlanningMissingField } from '@qona/shared';
import { compileInternalGraph } from './n8n-compiler.js';

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

  const answered = opts.missingFields.filter(f => f.answered);
  const unanswered = opts.missingFields.filter(f => !f.answered);
  if (unanswered.length > 0) {
    errors.push('Unanswered fields: ' + unanswered.map(f => f.question).join(', '));
  }

  if (!opts.draft) {
    errors.push('No workflow draft exists');
    return { safe: false, errors, warnings, shouldGoBackToClarifying: true };
  }

  if (!opts.draft.nodes || opts.draft.nodes.length === 0) {
    errors.push('Draft has no nodes');
    return { safe: false, errors, warnings, shouldGoBackToClarifying: true };
  }

  const validation = validateInternalGraph(opts.draft, 'complete');
  if (!validation.valid) {
    errors.push('Graph validation failed');
    for (const e of validation.errors) errors.push(e.message);
    return { safe: false, errors, warnings, shouldGoBackToClarifying: true };
  }

  const compiled = compileInternalGraph(opts.draft);
  if (!compiled.success) {
    errors.push('Workflow cannot be compiled');
    for (const e of compiled.errors) errors.push(e.message);
    return { safe: false, errors, warnings, shouldGoBackToClarifying: true };
  }

  if (compiled.warnings.length > 0) warnings.push(...compiled.warnings);
  if (answered.length < 2) warnings.push('Very few questions answered');

  return { safe: true, errors, warnings, shouldGoBackToClarifying: false };
}
