import { Router, Request, Response } from 'express';
import { templateService } from '../services/template.service.js';

export const templateRouter = Router();

// GET /api/templates - list or search templates
templateRouter.get('/', (req: Request, res: Response) => {
  const { q, featured } = req.query;
  let templates = templateService.getAllTemplates();

  if (featured === 'true') {
    templates = templates.filter((t) => t.featured);
  }

  if (typeof q === 'string' && q.trim()) {
    templates = templateService.searchTemplates(q);
  }

  res.json({ templates, count: templates.length });
});

// GET /api/templates/:id - get single template details
templateRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const template = templateService.getTemplateById(id) ?? templateService.getTemplateBySlug(id);

  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.json({ template });
});

// POST /api/templates/:id/clone - clone template into internal graph
templateRouter.post('/:id/clone', (req: Request, res: Response) => {
  const { id } = req.params;
  const { inputs } = req.body ?? {};

  const result = templateService.cloneTemplate(id, inputs ?? {});
  if (!result) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.json({
    message: 'Template cloned successfully',
    graph: result.graph,
    template: result.template,
  });
});
