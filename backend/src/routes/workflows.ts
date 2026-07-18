import { Router } from 'express';
import type { WorkflowStatus } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { workflowService } from '../services/workflow.service.js';
import { buildExport, validateForExport, getSetupInstructions } from '../services/export-engine.js';
import { db } from '../services/db.js';

export const workflowsRouter = Router();

const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  definition: z.record(z.unknown()),
});

const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  definition: z.record(z.unknown()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

workflowsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, skip, take } = req.query;
    const result = await workflowService.list(req.user!.authId, {
      status: status as WorkflowStatus | undefined,
      skip: skip ? parseInt(skip as string) : undefined,
      take: take ? parseInt(take as string) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

workflowsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const workflow = await workflowService.getById(id);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }
    res.json({ workflow });
  } catch (err) {
    next(err);
  }
});

workflowsRouter.post('/', requireAuth, validate(CreateWorkflowSchema), async (req, res, next) => {
  try {
    const workflow = await workflowService.create({
      userId: req.user!.authId,
      name: req.body.name,
      description: req.body.description,
      definition: req.body.definition,
    });
    res.status(201).json({ workflow });
  } catch (err) {
    next(err);
  }
});

workflowsRouter.put('/:id', requireAuth, validate(UpdateWorkflowSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const workflow = await workflowService.update(id, req.body);
    res.json({ workflow });
  } catch (err) {
    next(err);
  }
});

workflowsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    await workflowService.archive(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

workflowsRouter.get('/:id/exports', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const exports = await db.exportHistory.findByWorkflowId(id);
    res.json({ exports });
  } catch (err) {
    next(err);
  }
});

const ExportSchema = z.object({
  platform: z.enum(['n8n', 'zapier', 'make']),
});

workflowsRouter.post('/:id/export', requireAuth, validate(ExportSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const workflow = await workflowService.getById(id);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    const platform = req.body.platform;
    const definition = workflow.definition as Record<string, unknown>;

    const warnings = validateForExport(definition as any, platform);
    const hasErrors = warnings.some((w) => w.severity === 'error');
    if (hasErrors) {
      res.status(400).json({
        error: 'Workflow has validation errors',
        warnings: warnings.filter((w) => w.severity === 'error'),
      });
      return;
    }

    const exportResult = buildExport(definition as any, platform);

    await db.exportHistory.create({
      userId: workflow.userId,
      workflowId: workflow.id,
      platform,
      metadata: {
        workflowName: workflow.name,
        warnings: exportResult.warnings,
      },
    });

    res.json({
      export: exportResult.content,
      filename: exportResult.filename,
      instructions: exportResult.instructions,
      warnings: exportResult.warnings,
    });
  } catch (err) {
    next(err);
  }
});

workflowsRouter.post('/:id/export/download', requireAuth, validate(ExportSchema), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const workflow = await workflowService.getById(id);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    const platform = req.body.platform;
    const definition = workflow.definition as Record<string, unknown>;

    const warnings = validateForExport(definition as any, platform);
    const hasErrors = warnings.some((w) => w.severity === 'error');
    if (hasErrors) {
      res.status(400).json({
        error: 'Workflow has validation errors',
        warnings: warnings.filter((w) => w.severity === 'error'),
      });
      return;
    }

    const exportResult = buildExport(definition as any, platform);

    await db.exportHistory.create({
      userId: workflow.userId,
      workflowId: workflow.id,
      platform,
      metadata: { workflowName: workflow.name, downloaded: true },
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.json(exportResult.content);
  } catch (err) {
    next(err);
  }
});

workflowsRouter.get('/:id/validate', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const workflow = await workflowService.getById(id);
    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    const definition = workflow.definition as Record<string, unknown>;
    const n8nWarnings = validateForExport(definition as any, 'n8n');
    const zapierWarnings = validateForExport(definition as any, 'zapier');
    const makeWarnings = validateForExport(definition as any, 'make');

    res.json({
      valid: n8nWarnings.filter((w) => w.severity === 'error').length === 0,
      n8n: n8nWarnings,
      zapier: zapierWarnings,
      make: makeWarnings,
    });
  } catch (err) {
    next(err);
  }
});
