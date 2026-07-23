import { Router, Request, Response } from 'express';
import { executionSimulator } from '../services/execution-simulator/simulator-engine.js';
import { getPrisma } from '../lib/prisma.js';

export const simulationRouter = Router();

// POST /api/workflows/simulate - simulate execution of an InternalGraph directly
simulationRouter.post('/workflows/simulate', (req: Request, res: Response) => {
  const { graph, customTriggerPayload } = req.body ?? {};

  if (!graph || !graph.nodes) {
    res.status(400).json({ error: 'Valid internal graph is required for simulation' });
    return;
  }

  const trace = executionSimulator.simulateGraph(graph, customTriggerPayload);
  res.json({ trace });
});

// POST /api/sessions/:id/simulate - simulate execution of active planning session draft
simulationRouter.post('/sessions/:id/simulate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { customTriggerPayload } = req.body ?? {};
  const prisma = getPrisma();

  try {
    const session = await prisma.workflowPlanningSession.findUnique({
      where: { id },
    });

    if (!session || !session.workflowDraft) {
      res.status(404).json({ error: 'Session draft not found for simulation' });
      return;
    }

    const draftGraph = session.workflowDraft as any;
    const trace = executionSimulator.simulateGraph(draftGraph, customTriggerPayload);

    res.json({ trace, sessionState: session.state });

    res.json({ trace, sessionState: session.state });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to simulate session draft' });
  }
});
