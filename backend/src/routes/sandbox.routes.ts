import { Router, Request, Response } from 'express';
import { getPrisma } from '../lib/prisma.js';
import { executionSimulator } from '../services/execution-simulator/simulator-engine.js';
import type { InternalGraph } from '@qona/shared';
import type { ExecutionTrace } from '@qona/shared';

export const sandboxRouter = Router();

// In-memory store for sandbox execution sessions
// (ephemeral – cleared on restart, which is fine for a sandbox)
interface SandboxSession {
  id: string;
  workflowId?: string;
  graphId?: string;
  graphName: string;
  mode: 'mock' | 'live';
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  steps: SandboxStep[];
  startedAt?: string;
  completedAt?: string;
  triggerPayload?: Record<string, unknown>;
  createdAt: string;
}

interface SandboxStep {
  index: number;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  warnings?: string[];
  credentialRequirements?: string[];
  plainEnglishExplanation?: string;
  executionTimeMs?: number;
  logs?: string[];
  startedAt?: string;
  completedAt?: string;
}

const sandboxSessions = new Map<string, SandboxSession>();

function generateSessionId(): string {
  return `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * POST /api/sandbox/start
 * Start a new sandbox execution session from a graph object or workflow ID.
 * Returns a sessionId that can be polled.
 */
sandboxRouter.post('/sandbox/start', async (req: Request, res: Response) => {
  const { graph, workflowId, mode = 'mock', triggerPayload } = req.body ?? {};
  const prisma = getPrisma();

  let internalGraph: InternalGraph | null = null;
  let workflowName = 'Untitled Workflow';
  let resolvedWorkflowId: string | undefined;

  try {
    if (workflowId) {
      // Load graph from DB
      const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      internalGraph = workflow.definition as unknown as InternalGraph;
      workflowName = workflow.name;
      resolvedWorkflowId = workflow.id;
    } else if (graph) {
      internalGraph = graph as InternalGraph;
      workflowName = (graph as any)?.metadata?.name || 'Draft Workflow';
    } else {
      res.status(400).json({ error: 'Provide either a "graph" object or a "workflowId"' });
      return;
    }

    if (!internalGraph || !internalGraph.nodes || internalGraph.nodes.length === 0) {
      res.status(400).json({ error: 'Graph has no nodes to execute' });
      return;
    }

    // Build initial pending steps from graph
    const steps: SandboxStep[] = internalGraph.nodes.map((node, idx) => ({
      index: idx,
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: node.label || node.id,
      status: 'pending',
    }));

    const sessionId = generateSessionId();
    const session: SandboxSession = {
      id: sessionId,
      workflowId: resolvedWorkflowId,
      graphId: internalGraph.id,
      graphName: workflowName,
      mode: mode as 'mock' | 'live',
      status: 'idle',
      currentStep: 0,
      totalSteps: steps.length,
      steps,
      triggerPayload: triggerPayload ?? {},
      createdAt: new Date().toISOString(),
    };

    sandboxSessions.set(sessionId, session);

    res.json({
      sessionId,
      graphName: workflowName,
      totalSteps: steps.length,
      steps: steps.map((s) => ({ ...s, status: 'pending' })),
      mode,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start sandbox session' });
  }
});

/**
 * POST /api/sandbox/:sessionId/run
 * Run the entire sandbox execution at once (full simulation).
 * Returns the complete trace after all steps finish.
 */
sandboxRouter.post('/sandbox/:sessionId/run', async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const session = sandboxSessions.get(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Sandbox session not found. Start a new one.' });
    return;
  }

  if (session.status === 'running') {
    res.status(409).json({ error: 'Session is already running' });
    return;
  }

  const prisma = getPrisma();

  try {
    let internalGraph: InternalGraph | null = null;

    if (session.workflowId) {
      const workflow = await prisma.workflow.findUnique({ where: { id: session.workflowId } });
      if (workflow) {
        internalGraph = workflow.definition as unknown as InternalGraph;
      }
    }

    // If no workflowId stored, we can't re-hydrate graph here.
    // This endpoint is typically called right after /start where graph is fresh.
    // For now, run against steps we have.
    if (!internalGraph) {
      res.status(400).json({ error: 'Cannot re-run: graph not found. Please start a new session.' });
      return;
    }

    session.status = 'running';
    session.startedAt = new Date().toISOString();

    // Use existing simulator engine
    const trace: ExecutionTrace = executionSimulator.simulateGraph(internalGraph, session.triggerPayload);

    // Map trace steps back to sandbox steps
    session.steps = trace.steps.map((ts, idx) => ({
      index: idx,
      nodeId: ts.nodeId,
      nodeType: ts.nodeType,
      nodeLabel: ts.nodeLabel,
      status: ts.status === 'success' ? 'success' : ts.status === 'failed' ? 'failed' : 'success',
      inputData: ts.inputData,
      outputData: ts.outputData,
      warnings: ts.warnings,
      credentialRequirements: ts.credentialRequirements,
      plainEnglishExplanation: ts.plainEnglishExplanation,
      executionTimeMs: ts.executionTimeMs,
      logs: ts.logs,
      startedAt: session.startedAt,
      completedAt: new Date().toISOString(),
    }));

    session.currentStep = session.steps.length;
    session.status = trace.status === 'failed' ? 'failed' : 'completed';
    session.completedAt = new Date().toISOString();

    res.json({
      sessionId,
      status: session.status,
      steps: session.steps,
      summary: trace.summary,
      report: trace.report,
      totalDurationMs: trace.totalDurationMs,
      completedAt: session.completedAt,
    });
  } catch (err: any) {
    session.status = 'failed';
    res.status(500).json({ error: err.message || 'Execution failed' });
  }
});

/**
 * POST /api/sandbox/run-graph
 * Convenience: start + run in a single call. Accepts graph inline.
 * Ideal for the Chat builder where no workflow is saved yet.
 */
sandboxRouter.post('/sandbox/run-graph', async (req: Request, res: Response) => {
  const { graph, mode = 'mock', triggerPayload } = req.body ?? {};

  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    res.status(400).json({ error: 'Valid internal graph with nodes is required' });
    return;
  }

  try {
    const trace: ExecutionTrace = executionSimulator.simulateGraph(graph as InternalGraph, triggerPayload);

    const steps: SandboxStep[] = trace.steps.map((ts, idx) => ({
      index: idx,
      nodeId: ts.nodeId,
      nodeType: ts.nodeType,
      nodeLabel: ts.nodeLabel,
      status: ts.status === 'success' ? 'success' : 'failed',
      inputData: ts.inputData,
      outputData: ts.outputData,
      warnings: ts.warnings,
      credentialRequirements: ts.credentialRequirements,
      plainEnglishExplanation: ts.plainEnglishExplanation,
      executionTimeMs: ts.executionTimeMs,
      logs: ts.logs,
    }));

    const sessionId = generateSessionId();
    const graphName = (graph as any)?.metadata?.name || 'Draft Workflow';

    const session: SandboxSession = {
      id: sessionId,
      graphId: (graph as any)?.id,
      graphName,
      mode: mode as 'mock' | 'live',
      status: trace.status === 'failed' ? 'failed' : 'completed',
      currentStep: steps.length,
      totalSteps: steps.length,
      steps,
      startedAt: trace.startTime,
      completedAt: trace.endTime,
      triggerPayload: triggerPayload ?? {},
      createdAt: new Date().toISOString(),
    };

    sandboxSessions.set(sessionId, session);

    res.json({
      sessionId,
      graphName,
      status: session.status,
      totalSteps: steps.length,
      steps,
      summary: trace.summary,
      report: (trace as any).report,
      totalDurationMs: trace.totalDurationMs,
      mode,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sandbox execution failed' });
  }
});

/**
 * GET /api/sandbox/:sessionId
 * Get current state of a sandbox session (for polling).
 */
sandboxRouter.get('/sandbox/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const session = sandboxSessions.get(sessionId);

  if (!session) {
    res.status(404).json({ error: 'Sandbox session not found' });
    return;
  }

  res.json({
    sessionId: session.id,
    graphName: session.graphName,
    mode: session.mode,
    status: session.status,
    currentStep: session.currentStep,
    totalSteps: session.totalSteps,
    steps: session.steps,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  });
});

/**
 * DELETE /api/sandbox/:sessionId
 * Clean up a sandbox session.
 */
sandboxRouter.delete('/sandbox/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const existed = sandboxSessions.delete(sessionId);
  res.json({ deleted: existed, sessionId });
});

/**
 * GET /api/sandbox/sessions/list
 * List all active sandbox sessions (debug/admin).
 */
sandboxRouter.get('/sandbox/sessions/list', (_req: Request, res: Response) => {
  const sessions = Array.from(sandboxSessions.values()).map((s) => ({
    id: s.id,
    graphName: s.graphName,
    mode: s.mode,
    status: s.status,
    totalSteps: s.totalSteps,
    createdAt: s.createdAt,
  }));
  res.json({ sessions, count: sessions.length });
});
