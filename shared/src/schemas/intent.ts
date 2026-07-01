import { z } from 'zod';

export const ExtractedTriggerSchema = z.object({
  type: z.union([
    z.enum(['webhook', 'schedule', 'cron', 'manual', 'form_submission', 'email_received', 'payment_received']),
    z.string().startsWith('n8n-nodes-base.')
  ]),
  label: z.string(),
  description: z.string().default(''),
  config: z.object({
    method: z.enum(['GET', 'POST']).optional(),
    cronExpression: z.string().optional(),
    timezone: z.string().optional(),
  }).passthrough().optional(),
});

export const ExtractedActionSchema = z.object({
  type: z.union([
    z.enum([
      'send_email', 'http_request', 'transform_data', 'filter', 'delay',
      'create_record', 'update_record', 'send_notification', 'run_code', 'google_sheets',
      'gmail', 'slack', 'telegram', 'supabase',
    ]),
    z.string().startsWith('n8n-nodes-base.')
  ]),
  label: z.string(),
  description: z.string().default(''),
  order: z.number().int().positive().default(1),
  config: z.object({
    url: z.string().optional(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
    to: z.string().optional(),
    subject: z.string().optional(),
    expression: z.string().optional(),
    durationMs: z.number().positive().optional(),
    code: z.string().optional(),
    spreadsheetId: z.string().optional(),
  }).passthrough().optional(),
});

export const ExtractedIntegrationSchema = z.object({
  name: z.string(),
  type: z.enum(['email', 'crm', 'sheets', 'slack', 'api', 'database', 'payment', 'storage', 'custom']),
  purpose: z.string().default(''),
});

export const IntentExtractionResultSchema = z.object({
  trigger: ExtractedTriggerSchema,
  actions: z.array(ExtractedActionSchema).min(1),
  integrations: z.array(ExtractedIntegrationSchema).default([]),
  confidence: z.number().min(0).max(1),
  missingDetails: z.array(z.string()).default([]),
});

export type ExtractedTrigger = z.infer<typeof ExtractedTriggerSchema>;
export type ExtractedAction = z.infer<typeof ExtractedActionSchema>;
export type ExtractedIntegration = z.infer<typeof ExtractedIntegrationSchema>;
export type IntentExtractionResult = z.infer<typeof IntentExtractionResultSchema>;
