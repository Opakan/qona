import { z } from 'zod';

export const NodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: NodePositionSchema,
  data: z.record(z.unknown()).default({}),
  connections: z.array(z.string()).default([]),
});

export const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
});

export const WorkflowMetadataSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const WorkflowDefinitionSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  metadata: WorkflowMetadataSchema,
});

export const WorkflowExportFormatSchema = z.object({
  name: z.string(),
  nodes: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      typeVersion: z.number().default(1),
      position: z.array(z.number()).length(2),
      parameters: z.record(z.unknown()).default({}),
    }),
  ),
  connections: z.record(
    z.record(
      z.array(
        z.object({
          node: z.string(),
          type: z.string().optional(),
          index: z.number().optional(),
        }),
      ),
    ),
  ),
});

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowExportFormat = z.infer<typeof WorkflowExportFormatSchema>;
