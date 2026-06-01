import { z } from 'zod';

export const PLANNING_STATES = {
  COLLECTING_INTENT: 'collecting_intent',
  CLARIFYING: 'clarifying',
  GENERATING_GRAPH: 'generating_graph',
  COMPILING: 'compiling',
  COMPLETED: 'completed',
} as const;

export const PlanningStateSchema = z.enum([
  'collecting_intent',
  'clarifying',
  'generating_graph',
  'compiling',
  'completed',
]);

export const PlanningCollectedAnswerSchema = z.object({
  questionId: z.string(),
  field: z.string(),
  value: z.string(),
  answeredAt: z.string().datetime().optional(),
});

export const PlanningMissingFieldSchema = z.object({
  field: z.string(),
  question: z.string(),
  severity: z.enum(['required', 'recommended']),
  answered: z.boolean().default(false),
});

export const WorkflowPlanningSessionSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  state: PlanningStateSchema.default('collecting_intent'),
  collectedAnswers: z.array(PlanningCollectedAnswerSchema).default([]),
  missingFields: z.array(PlanningMissingFieldSchema).default([]),
  extractedIntent: z.unknown().nullable().optional(),
  workflowDraft: z.unknown().nullable().optional(),
  internalGraphId: z.string().nullable().optional(),
  conversationId: z.string().nullable().optional(),
  stage: z.number().int().min(0).default(0),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type PlanningState = z.infer<typeof PlanningStateSchema>;
export type PlanningCollectedAnswer = z.infer<typeof PlanningCollectedAnswerSchema>;
export type PlanningMissingField = z.infer<typeof PlanningMissingFieldSchema>;
export type WorkflowPlanningSession = z.infer<typeof WorkflowPlanningSessionSchema>;
