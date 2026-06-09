import { z } from 'zod';

export const WORKFLOW_PLAN_STAGES = {
  EXTRACTING_INTENT: 'extracting_intent',
  PLANNING: 'planning',
  COLLECTING_REQUIREMENTS: 'collecting_requirements',
  BUILDING_GRAPH: 'building_graph',
  COMPILING: 'compiling',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const WorkflowPlanStageSchema = z.enum([
  'extracting_intent',
  'planning',
  'collecting_requirements',
  'building_graph',
  'compiling',
  'completed',
  'failed',
]);

export const WorkflowPlanTriggerSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  config: z.record(z.unknown()).default({}),
});

export const WorkflowPlanActionSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  order: z.number().int().positive().default(1),
  config: z.record(z.unknown()).default({}),
});

export const WorkflowPlanIntegrationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['email', 'crm', 'sheets', 'slack', 'api', 'database', 'payment', 'storage', 'custom']),
  purpose: z.string().default(''),
});

export const WorkflowPlanQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1).max(500),
  field: z.string(),
  severity: z.enum(['required', 'recommended']).default('required'),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
  affects: z.enum(['trigger', 'action', 'integration']),
  answered: z.boolean().default(false),
  answer: z.string().optional(),
});

export const WorkflowPlanRequirementSchema = z.object({
  field: z.string(),
  label: z.string(),
  kind: z.enum(['trigger_config', 'action_config', 'integration', 'general']),
  required: z.boolean().default(true),
  collected: z.boolean().default(false),
  value: z.string().optional(),
});

export const WorkflowPlanSchema = z.object({
  goal: z.string().min(1).max(5000),
  stage: WorkflowPlanStageSchema.default('extracting_intent'),
  trigger: WorkflowPlanTriggerSchema.optional(),
  actions: z.array(WorkflowPlanActionSchema).default([]),
  integrations: z.array(WorkflowPlanIntegrationSchema).default([]),
  questions: z.array(WorkflowPlanQuestionSchema).default([]),
  requirements: z.array(WorkflowPlanRequirementSchema).default([]),
  confidence: z.number().min(0).max(1).default(0),
});

export const WorkflowPlanValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    path: z.string(),
    message: z.string(),
    severity: z.enum(['error', 'warning']),
  })),
});

export type WorkflowPlanStage = z.infer<typeof WorkflowPlanStageSchema>;
export type WorkflowPlanTrigger = z.infer<typeof WorkflowPlanTriggerSchema>;
export type WorkflowPlanAction = z.infer<typeof WorkflowPlanActionSchema>;
export type WorkflowPlanIntegration = z.infer<typeof WorkflowPlanIntegrationSchema>;
export type WorkflowPlanQuestion = z.infer<typeof WorkflowPlanQuestionSchema>;
export type WorkflowPlanRequirement = z.infer<typeof WorkflowPlanRequirementSchema>;
export type WorkflowPlan = z.infer<typeof WorkflowPlanSchema>;
export type WorkflowPlanValidationResult = z.infer<typeof WorkflowPlanValidationResultSchema>;
