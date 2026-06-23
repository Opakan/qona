import { Router } from 'express';
import { extractIntent } from '../services/intent-extractor.js';
import {
  buildInitialPlan,
  detectMissingRequirements,
  generateNextQuestion,
} from '../services/requirement-collector.js';
import { buildInternalGraph, validatePlanForGraphBuild } from '../services/internal-graph-builder.js';
import {
  validateGraph,
  validateGraphForCompilation,
  formatValidationSummary,
} from '../services/graph-validator.js';
import { compileInternalGraph } from '../services/n8n-compiler.js';
import { planWorkflow } from '../services/workflow-planner.js';
import { nodeRegistry } from '../services/node-registry.js';
import { WorkflowPlanSchema, InternalGraphSchema } from '@qona/shared';

export const debugRouter = Router();

debugRouter.post('/debug/requirements', async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'prompt is required and must be a non-empty string' });
      return;
    }

    const intent = await extractIntent(prompt.trim());

    const plan = buildInitialPlan(intent, prompt.trim());

    const missing = detectMissingRequirements(plan.requirements);

    const questions = missing.map((req) => generateNextQuestion(plan, req));

    res.json({
      debug: 'requirement-collection',
      prompt: prompt.trim(),
      intent: {
        trigger: intent.trigger,
        actions: intent.actions,
        integrations: intent.integrations,
        confidence: intent.confidence,
        missingDetails: intent.missingDetails,
      },
      plan: {
        stage: plan.stage,
        goal: plan.goal,
        trigger: plan.trigger,
        actions: plan.actions,
        integrations: plan.integrations,
      },
      requirements: {
        total: plan.requirements.length,
        collected: plan.requirements.filter((r) => r.collected).length,
        missing: missing.length,
        items: plan.requirements.map((r) => ({
          field: r.field,
          label: r.label,
          kind: r.kind,
          required: r.required,
          collected: r.collected,
          value: r.value ?? null,
        })),
      },
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        field: q.field,
        severity: q.severity,
        options: q.options ?? null,
        defaultValue: q.defaultValue ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/debug/graph
// Input: completed WorkflowPlan (all requirements collected)
// Output: generated InternalGraph + build warnings
// ═══════════════════════════════════════════════════════════

debugRouter.post('/debug/graph', async (req, res, next) => {
  try {
    const parsed = WorkflowPlanSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'body must be a valid WorkflowPlan',
        details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
      return;
    }

    const plan = parsed.data;

    const unmet = detectMissingRequirements(plan.requirements);
    const preBuildIssues = validatePlanForGraphBuild(plan);

    const { graph, warnings } = buildInternalGraph(plan);

    res.json({
      debug: 'graph-generation',
      input: {
        goal: plan.goal,
        triggerType: plan.trigger?.type ?? null,
        actionCount: plan.actions.length,
        requirementCount: plan.requirements.length,
        requirementsCollected: plan.requirements.filter((r) => r.collected).length,
        requirementsMissing: unmet.length,
      },
      preBuildValidation: {
        issues: preBuildIssues,
        hasErrors: preBuildIssues.some((e) => e.severity === 'error'),
      },
      output: {
        graph,
        buildWarnings: warnings,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/debug/validate
// Input: InternalGraph JSON
// Output: GraphValidationResult (valid, errors, warnings, summary)
// Query: ?strict=true uses validateGraphForCompilation (rejects warnings too)
// ═══════════════════════════════════════════════════════════

debugRouter.post('/debug/validate', async (req, res, next) => {
  try {
    const parsed = InternalGraphSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'body must be a valid InternalGraph',
        details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
      return;
    }

    const graph = parsed.data;
    const strict = req.query.strict === 'true';
    const registeredTypes = new Set(nodeRegistry.getNodeTypes());

    const result = strict
      ? validateGraphForCompilation(graph, { registeredTypes })
      : validateGraph(graph, { registeredTypes });

    const summary = formatValidationSummary(result);

    res.json({
      debug: 'graph-validation',
      mode: strict ? 'strict' : 'standard',
      input: {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        nodeTypes: graph.nodes.map((n) => n.type),
      },
      output: {
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        summary: result.summary,
        humanSummary: summary,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/debug/compile
// Input: InternalGraph JSON
// Output: CompilationResult (success, workflow, errors, warnings)
// ═══════════════════════════════════════════════════════════

debugRouter.post('/debug/compile', async (req, res, next) => {
  try {
    const parsed = InternalGraphSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'body must be a valid InternalGraph',
        details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
      return;
    }

    const graph = parsed.data;

    const result = compileInternalGraph(graph);

    res.json({
      debug: 'n8n-compilation',
      input: {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        nodeTypes: graph.nodes.map((n) => n.type),
      },
      output: {
        success: result.success,
        workflow: result.workflow ?? null,
        errors: result.errors,
        warnings: result.warnings,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/debug/planner
// Input: { "prompt": "..." }
// Output: PlannerResult from workflow-planner.ts
// ═══════════════════════════════════════════════════════════

debugRouter.post('/debug/planner', async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'prompt is required and must be a non-empty string' });
      return;
    }

    const result = await planWorkflow(prompt.trim());

    res.json({
      debug: 'workflow-planner',
      prompt: prompt.trim(),
      output: result,
    });
  } catch (err) {
    next(err);
  }
});
