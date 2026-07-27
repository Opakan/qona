import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { templateSearchService } from '../services/template-search.service.js';
import { workflowService } from '../services/workflow.service.js';

export const templatesRouter = Router();

/** GET /api/templates — Search and filter templates */
templatesRouter.get('/', async (req, res, next) => {
  try {
    const { query, category, tool, limit, offset } = req.query;

    const result = templateSearchService.search({
      query: query ? String(query) : undefined,
      category: category ? String(category) : undefined,
      tool: tool ? String(tool) : undefined,
      limit: limit ? parseInt(String(limit), 10) : 20,
      offset: offset ? parseInt(String(offset), 10) : 0,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** GET /api/templates/metadata — Categories & Tools list */
templatesRouter.get('/metadata', async (_req, res, next) => {
  try {
    const categories = templateSearchService.getCategories();
    const tools = templateSearchService.getTools();
    res.json({ categories, tools });
  } catch (err) {
    next(err);
  }
});

/** GET /api/templates/:id — Get specific template details */
templatesRouter.get('/:id', async (req, res, next) => {
  try {
    const template = templateSearchService.getById(String(req.params.id));
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.json({ template });
  } catch (err) {
    next(err);
  }
});

/** POST /api/templates/:id/clone — Clone a template to user's workflows */
templatesRouter.post('/:id/clone', requireAuth, async (req, res, next) => {
  try {
    const template = templateSearchService.getById(String(req.params.id));
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    const workflow = await workflowService.create({
      userId: req.user!.authId,
      name: `${template.title} (Copy)`,
      description: template.description,
      definition: template.n8nDefinition,
    });

    res.status(201).json({ workflow, templateId: template.id });
  } catch (err) {
    next(err);
  }
});
