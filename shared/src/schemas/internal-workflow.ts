import { z } from 'zod';

// ═══════════════════════════════════════════════════════════
// TRIGGER TYPES
// ═══════════════════════════════════════════════════════════

export const INTERNAL_TRIGGER_TYPES = {
  WEBHOOK: 'webhook',
  SCHEDULE: 'schedule',
  CRON: 'cron',
  MANUAL: 'manual',
  FORM_SUBMISSION: 'form_submission',
  EMAIL_RECEIVED: 'email_received',
  PAYMENT_RECEIVED: 'payment_received',
} as const;

export const TriggerTypeSchema = z.union([
  z.enum([
    'webhook', 'schedule', 'cron', 'manual',
    'form_submission', 'email_received', 'payment_received',
  ]),
  z.string().startsWith('n8n-nodes-base.')
]);

export const TriggerConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  path: z.string().optional(),
  cronExpression: z.string().optional(),
  timezone: z.string().optional(),
  authentication: z.enum(['none', 'basic', 'bearer', 'api_key']).optional(),
  headers: z.record(z.string()).optional(),
}).passthrough();

export const InternalTriggerSchema = z.object({
  id: z.string(),
  type: TriggerTypeSchema,
  label: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  config: TriggerConfigSchema.default({}),
  position: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
});

export type InternalTriggerType = z.infer<typeof TriggerTypeSchema>;
export type InternalTrigger = z.infer<typeof InternalTriggerSchema>;

// ═══════════════════════════════════════════════════════════
// ACTION TYPES
// ═══════════════════════════════════════════════════════════

export const INTERNAL_ACTION_TYPES = {
  SEND_EMAIL: 'send_email',
  HTTP_REQUEST: 'http_request',
  TRANSFORM_DATA: 'transform_data',
  FILTER: 'filter',
  DELAY: 'delay',
  CREATE_RECORD: 'create_record',
  UPDATE_RECORD: 'update_record',
  SEND_NOTIFICATION: 'send_notification',
  RUN_CODE: 'run_code',
  GOOGLE_SHEETS: 'google_sheets',
} as const;

export const ActionTypeSchema = z.union([
  z.enum([
    'send_email', 'http_request', 'transform_data', 'filter',
    'delay', 'create_record', 'update_record', 'send_notification',
    'run_code', 'google_sheets',
  ]),
  z.string().startsWith('n8n-nodes-base.')
]);

export const ActionConfigSchema = z.object({
  url: z.string().url().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  headers: z.record(z.string()).optional(),
  body: z.record(z.unknown()).optional(),
  expression: z.string().optional(),
  durationMs: z.number().int().positive().optional(),
  to: z.union([z.string(), z.array(z.string())]).optional(),
  subject: z.string().optional(),
  template: z.string().optional(),
  code: z.string().optional(),
  spreadsheetId: z.string().optional(),
  sheetName: z.string().optional(),
}).passthrough();

export const InternalActionSchema = z.object({
  id: z.string(),
  type: ActionTypeSchema,
  label: z.string().min(1).max(200),
  description: z.string().max(500).default(''),
  config: ActionConfigSchema.default({}),
  position: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
});

export type InternalActionType = z.infer<typeof ActionTypeSchema>;
export type InternalAction = z.infer<typeof InternalActionSchema>;

// ═══════════════════════════════════════════════════════════
// CONNECTION TYPES
// ═══════════════════════════════════════════════════════════

export const INTERNAL_CONNECTION_TYPES = {
  DIRECT: 'direct',
  CONDITIONAL: 'conditional',
  LOOP: 'loop',
  MERGE: 'merge',
} as const;

export const ConnectionTypeSchema = z.enum(['direct', 'conditional', 'loop', 'merge']);

export const ConnectionConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'matches_regex', 'exists', 'not_exists']),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  valueField: z.string().optional(),
});

export const InternalConditionalBranchSchema = z.object({
  label: z.string().default(''),
  conditions: z.array(ConnectionConditionSchema),
  targetId: z.string(),
});

export const InternalConnectionSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  type: ConnectionTypeSchema,
  label: z.string().default(''),
  conditions: z.array(ConnectionConditionSchema).default([]),
  branches: z.array(z.object({
    label: z.string().default(''),
    conditions: z.array(ConnectionConditionSchema),
    targetId: z.string(),
  })).default([]),
});

export type InternalConnectionType = z.infer<typeof ConnectionTypeSchema>;
export type InternalConnection = z.infer<typeof InternalConnectionSchema>;
export type InternalConditionalBranch = z.infer<typeof InternalConditionalBranchSchema>;

// ═══════════════════════════════════════════════════════════
// FULL INTERNAL WORKFLOW
// ═══════════════════════════════════════════════════════════

export const InternalWorkflowMetadataSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  version: z.number().int().positive().default(1),
  tags: z.array(z.string()).default([]),
  author: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const InternalWorkflowSchema = z.object({
  id: z.string(),
  metadata: InternalWorkflowMetadataSchema,
  triggers: z.array(InternalTriggerSchema),
  actions: z.array(InternalActionSchema),
  connections: z.array(InternalConnectionSchema),
});

export const InternalWorkflowValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.object({
    path: z.string(),
    message: z.string(),
    severity: z.enum(['error', 'warning']),
  })),
});

export type InternalWorkflowMetadata = z.infer<typeof InternalWorkflowMetadataSchema>;
export type InternalWorkflow = z.infer<typeof InternalWorkflowSchema>;
export type InternalWorkflowValidationResult = z.infer<typeof InternalWorkflowValidationResultSchema>;
