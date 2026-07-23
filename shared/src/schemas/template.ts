import { z } from 'zod';
import { InternalGraphSchema } from './internal-graph.js';

export const TemplateUserInputSchema = z.object({
  nodeId: z.string(),
  field: z.string(),
  label: z.string(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  setupGuide: z.string().optional(),
});

export const TemplateSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  icon: z.string().default('zap'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
  tags: z.array(z.string()).default([]),
  graph: InternalGraphSchema,
  plainEnglishSummary: z.array(z.string()).default([]),
  requiredUserInputs: z.array(TemplateUserInputSchema).default([]),
  n8nVersion: z.string().default('1.0'),
  featured: z.boolean().default(false),
});

export type TemplateUserInput = z.infer<typeof TemplateUserInputSchema>;
export type Template = z.infer<typeof TemplateSchema>;
