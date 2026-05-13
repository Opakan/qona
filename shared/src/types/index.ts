import type { z } from 'zod';
import type {
  WorkflowNodeSchema,
  WorkflowEdgeSchema,
  WorkflowMetadataSchema,
  WorkflowDefinitionSchema,
  WorkflowExportFormatSchema,
} from '../schemas/workflow.js';
import type { UserProfileSchema, UpdateUserProfileSchema } from '../schemas/user.js';
import type {
  AIWorkflowRequestSchema,
  AIWorkflowResponseSchema,
  AIClarificationQuestionSchema,
  AIClarificationResponseSchema,
  AIWorkflowRefinementSchema,
} from '../schemas/ai.js';

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type WorkflowMetadata = z.infer<typeof WorkflowMetadataSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowExportFormat = z.infer<typeof WorkflowExportFormatSchema>;

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;

export type AIWorkflowRequest = z.infer<typeof AIWorkflowRequestSchema>;
export type AIWorkflowResponse = z.infer<typeof AIWorkflowResponseSchema>;
export type AIClarificationQuestion = z.infer<typeof AIClarificationQuestionSchema>;
export type AIClarificationResponse = z.infer<typeof AIClarificationResponseSchema>;
export type AIWorkflowRefinement = z.infer<typeof AIWorkflowRefinementSchema>;
