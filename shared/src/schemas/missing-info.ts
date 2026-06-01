import { z } from 'zod';

export const FollowUpQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1).max(500),
  field: z.string(),
  severity: z.enum(['required', 'recommended']).default('required'),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
  affects: z.enum(['trigger', 'action', 'integration']),
});

export const MissingInfoResultSchema = z.object({
  questions: z.array(FollowUpQuestionSchema),
  analysedTrigger: z.boolean(),
  analysedActions: z.number().int().min(0),
  analysedIntegrations: z.number().int().min(0),
  totalMissing: z.number().int().min(0),
  complete: z.boolean(),
});

export type FollowUpQuestion = z.infer<typeof FollowUpQuestionSchema>;
export type MissingInfoResult = z.infer<typeof MissingInfoResultSchema>;
