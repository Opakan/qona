import { z } from 'zod';

// ═══════════════════════════════════════════════════════
// Position
// ═══════════════════════════════════════════════════════

export const GraphPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// ═══════════════════════════════════════════════════════
// Node
// ═══════════════════════════════════════════════════════

export const GraphNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  position: GraphPositionSchema.default({ x: 0, y: 0 }),
  config: z.record(z.unknown()).default({}),
  connections: z.array(z.string()).default([]),
});

export type GraphNode = z.infer<typeof GraphNodeSchema>;

// ═══════════════════════════════════════════════════════
// Edge
// ═══════════════════════════════════════════════════════

export const GraphEdgeTypeSchema = z.enum(['direct', 'conditional', 'loop', 'merge']);

export const GraphConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'matches_regex']),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const GraphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: GraphEdgeTypeSchema.default('direct'),
  label: z.string().max(200).default(''),
  conditions: z.array(GraphConditionSchema).default([]),
});

export type GraphEdgeType = z.infer<typeof GraphEdgeTypeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type GraphCondition = z.infer<typeof GraphConditionSchema>;

// ═══════════════════════════════════════════════════════
// Metadata
// ═══════════════════════════════════════════════════════

export const GraphMetadataSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  version: z.number().int().positive().default(1),
  tags: z.array(z.string()).default([]),
  author: z.string().optional(),
});

export type GraphMetadata = z.infer<typeof GraphMetadataSchema>;

// ═══════════════════════════════════════════════════════
// Internal Graph (platform-independent workflow)
// ═══════════════════════════════════════════════════════

export const InternalGraphSchema = z.object({
  id: z.string().optional(),
  metadata: GraphMetadataSchema,
  nodes: z.array(GraphNodeSchema).default([]),
  edges: z.array(GraphEdgeSchema).default([]),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type InternalGraph = z.infer<typeof InternalGraphSchema>;

// ═══════════════════════════════════════════════════════
// Validation helpers
// ═══════════════════════════════════════════════════════

export const GraphValidationErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
  severity: z.enum(['error', 'warning']),
});

export const GraphValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(GraphValidationErrorSchema),
});

export type GraphValidationError = z.infer<typeof GraphValidationErrorSchema>;
export type GraphValidationResult = z.infer<typeof GraphValidationResultSchema>;
