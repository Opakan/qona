import { db } from './db.js';
import type { Workflow, WorkflowStatus } from '@prisma/client';

export const workflowService = {
  async list(userId: string, options?: { status?: WorkflowStatus; skip?: number; take?: number }) {
    const [workflows, total] = await Promise.all([
      db.workflow.findByUserId(userId, options),
      db.workflow.countByUserId(userId),
    ]);
    return { workflows, total };
  },

  async getById(id: string) {
    return db.workflow.findById(id);
  },

  async create(params: {
    userId: string;
    name: string;
    description?: string;
    definition: Record<string, unknown>;
  }) {
    const workflow = await db.workflow.create(params);
    await db.workflow.createVersion(workflow.id, params.definition, 'Initial version');
    return workflow;
  },

  async update(id: string, params: {
    name?: string;
    description?: string;
    definition?: Record<string, unknown>;
    status?: WorkflowStatus;
  }) {
    const workflow = await db.workflow.update(id, params);

    if (params.definition) {
      await db.workflow.createVersion(
        id,
        params.definition,
        'Manual update',
      );
    }

    return workflow;
  },

  async delete(id: string) {
    return db.workflow.delete(id);
  },

  async archive(id: string) {
    return db.workflow.archive(id);
  },

  async getVersions(workflowId: string) {
    return db.workflow.listVersions(workflowId);
  },

  async exportWorkflow(
    workflow: Workflow,
    platform: string,
    options?: { metadata?: Record<string, unknown> },
  ) {
    const definition = workflow.definition as Record<string, unknown>;

    const exported: Record<string, unknown> = {
      name: workflow.name,
      description: workflow.description,
      platform,
      exportedAt: new Date().toISOString(),
      ...definition,
    };

    await db.exportHistory.create({
      userId: workflow.userId,
      workflowId: workflow.id,
      platform,
      format: 'json',
      metadata: {
        ...options?.metadata,
        workflowName: workflow.name,
        definition,
      },
    });

    return exported;
  },
};
