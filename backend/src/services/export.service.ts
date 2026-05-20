import { db } from './db.js';

export const exportService = {
  async getUserExports(userId: string, options?: { skip?: number; take?: number }) {
    const [exports, total] = await Promise.all([
      db.exportHistory.findByUserId(userId, options),
      db.exportHistory.countByUserId(userId),
    ]);
    return { exports, total };
  },

  async getWorkflowExports(workflowId: string) {
    return db.exportHistory.findByWorkflowId(workflowId);
  },

  async logExport(params: {
    userId: string;
    workflowId: string;
    platform: string;
    format?: string;
    status?: string;
    fileUrl?: string;
    metadata?: Record<string, unknown>;
  }) {
    return db.exportHistory.create(params);
  },
};
