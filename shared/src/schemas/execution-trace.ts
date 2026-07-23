import { z } from 'zod';

export const NodeExecutionStepSchema = z.object({
  stepIndex: z.number(),
  nodeId: z.string(),
  nodeType: z.string(),
  nodeLabel: z.string(),
  status: z.enum(['pending', 'running', 'success', 'skipped', 'failed']),
  inputData: z.record(z.unknown()).default({}),
  resolvedParameters: z.record(z.unknown()).default({}),
  expressions: z.record(z.string()).default({}),
  outputData: z.record(z.unknown()).default({}),
  warnings: z.array(z.string()).default([]),
  credentialRequirements: z.array(z.string()).default([]),
  plainEnglishExplanation: z.string().optional(),
  validationStatus: z.enum(['VALID', 'WARNING', 'ERROR']).default('VALID'),
  executionTimeMs: z.number().default(0),
  logs: z.array(z.string()).default([]),
  errorMessage: z.string().optional(),
});

export const ExecutionReportSchema = z.object({
  workflowSummary: z.string(),
  trigger: z.string(),
  actions: z.array(z.string()),
  estimatedRuntimeMs: z.number(),
  dataFlowSummary: z.array(z.string()),
  generatedOutputsSummary: z.record(z.unknown()),
  credentialRequirements: z.array(z.string()),
  validationResults: z.array(z.string()),
  potentialIssues: z.array(z.string()),
  exportReadiness: z.enum(['READY', 'NEEDS_ATTENTION', 'BLOCKED']),
  confidenceScore: z.number(),
  checkmarks: z.object({
    valid: z.boolean(),
    parametersComplete: z.boolean(),
    connectionsValid: z.boolean(),
    exportReady: z.boolean(),
  }),
});

export const ExecutionTraceSchema = z.object({
  id: z.string(),
  graphId: z.string(),
  graphName: z.string(),
  status: z.enum(['success', 'failed', 'partial']),
  startTime: z.string(),
  endTime: z.string(),
  totalDurationMs: z.number(),
  steps: z.array(NodeExecutionStepSchema),
  simulatedTriggerPayload: z.record(z.unknown()).default({}),
  summary: z.array(z.string()).default([]),
  report: ExecutionReportSchema.optional(),
});

export type NodeExecutionStep = z.infer<typeof NodeExecutionStepSchema>;
export type ExecutionReport = z.infer<typeof ExecutionReportSchema>;
export type ExecutionTrace = z.infer<typeof ExecutionTraceSchema>;
