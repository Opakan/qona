import { z } from 'zod';
import { WorkflowDefinitionSchema } from './workflow.js';

export const AIWorkflowRequestSchema = z.object({
  prompt: z.string().min(1).max(5000),
  context: z
    .object({
      existingWorkflow: WorkflowDefinitionSchema.optional(),
      userPreferences: z.record(z.unknown()).optional(),
    })
    .optional(),
});

export const AIWorkflowResponseSchema = z.object({
  workflow: WorkflowDefinitionSchema,
  explanation: z.string().max(5000),
  confidence: z.number().min(0).max(1),
});

export const AIClarificationQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1).max(500),
  field: z.string().optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(true),
});

export const AIClarificationResponseSchema = z.object({
  questions: z.array(AIClarificationQuestionSchema),
  requiresClarification: z.boolean(),
});

export const AIWorkflowRefinementSchema = z.object({
  feedback: z.string().min(1).max(5000),
  existingWorkflow: WorkflowDefinitionSchema,
});

export type AIWorkflowRequest = z.infer<typeof AIWorkflowRequestSchema>;
export type AIWorkflowResponse = z.infer<typeof AIWorkflowResponseSchema>;
export type AIClarificationQuestion = z.infer<typeof AIClarificationQuestionSchema>;
export type AIClarificationResponse = z.infer<typeof AIClarificationResponseSchema>;
export type AIWorkflowRefinement = z.infer<typeof AIWorkflowRefinementSchema>;
