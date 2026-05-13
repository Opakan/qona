export const NODE_TYPES = {
  TRIGGER: 'trigger',
  ACTION: 'action',
  CONDITION: 'condition',
  TRANSFORM: 'transform',
  OUTPUT: 'output',
  WEBHOOK: 'webhook',
  DELAY: 'delay',
  LOOP: 'loop',
  FILTER: 'filter',
  MERGE: 'merge',
} as const;

export const WORKFLOW_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export const AI_CONFIDENCE_THRESHOLD = 0.7;
export const MAX_WORKFLOW_NODES = 100;
export const MAX_WORKFLOW_NAME_LENGTH = 200;
export const MAX_WORKFLOW_DESCRIPTION_LENGTH = 1000;
export const MAX_PROMPT_LENGTH = 5000;
export const DEFAULT_WORKFLOW_VERSION = 1;

export const DISPOSABLE_EMAIL_DOMAINS = [
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'sharklasers.com',
  'trashmail.com',
  'mailnator.com',
  'dispostable.com',
  'temp-mail.org',
  'maildrop.cc',
  'getairmail.com',
  'fakeinbox.com',
  'mailexpire.com',
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];
