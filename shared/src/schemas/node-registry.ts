import { z } from 'zod';

export const NodeFieldSchema = z.object({
  field: z.string().min(1),
  label: z.string().min(1).max(200),
  type: z.enum(['string', 'number', 'boolean', 'email', 'url', 'text', 'json', 'select', 'password', 'cron']),
  description: z.string().max(500).default(''),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
  placeholder: z.string().optional(),
});

export const NodeOutputSchema = z.object({
  field: z.string().min(1),
  label: z.string().min(1).max(200),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string().max(500).default(''),
});

export const SetupGuideStepSchema = z.object({
  title: z.string().optional(),
  instruction: z.string(),
  tip: z.string().optional(),
});

export const SetupGuideSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  steps: z.array(z.union([z.string(), SetupGuideStepSchema])),
  docUrl: z.string().optional(),
});

export const NodeDefinitionSchema = z.object({
  nodeType: z.string().min(1),
  displayName: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  category: z.enum(['trigger', 'action']),
  requiredFields: z.array(NodeFieldSchema).default([]),
  optionalFields: z.array(NodeFieldSchema).default([]),
  outputs: z.array(NodeOutputSchema).default([]),
  n8nType: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  plainEnglishExplanation: z.string().optional(),
  setupGuide: SetupGuideSchema.optional(),
});

export const NodeRegistrySchema = z.object({
  version: z.string().default('1.0'),
  nodes: z.array(NodeDefinitionSchema),
});

export type NodeField = z.infer<typeof NodeFieldSchema>;
export type NodeOutput = z.infer<typeof NodeOutputSchema>;
export type SetupGuideStep = z.infer<typeof SetupGuideStepSchema>;
export type SetupGuide = z.infer<typeof SetupGuideSchema>;
export type NodeDefinition = z.infer<typeof NodeDefinitionSchema>;
export type NodeRegistry = z.infer<typeof NodeRegistrySchema>;

