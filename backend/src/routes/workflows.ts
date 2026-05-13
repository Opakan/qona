import { Router } from 'express';

export const workflowsRouter = Router();

workflowsRouter.get('/', (_req, res) => {
  res.json({ workflows: [], total: 0 });
});

workflowsRouter.get('/:id', (req, res) => {
  res.json({ workflow: null, id: req.params.id });
});
