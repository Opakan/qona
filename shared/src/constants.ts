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



export const CREDENTIAL_FIELDS = new Set([
  'apiKey', 'api_key', 'apikey',
  'password', 'passwd', 'pwd',
  'token', 'accessToken', 'access_token', 'refreshToken', 'refresh_token',
  'secret', 'secretKey', 'secret_key', 'clientSecret', 'client_secret',
  'privateKey', 'private_key', 'privateKeyPem',
  'oauthToken', 'oauth_token', 'bearerToken', 'bearer_token',
  'credential', 'credentials', 'authToken', 'auth_token',
  'jwtSecret', 'jwt_secret', 'signingKey', 'signing_key',
  'encryptionKey', 'encryption_key',
  'supabaseKey', 'supabase_key', 'supabaseServiceKey',
  'deepseekKey', 'openaiKey', 'stripeKey', 'paystackKey', 'flutterwaveKey',
]);

export const CREDENTIAL_GUARD_PROMPT = `
CREDENTIAL AND SECURITY RULES (CRITICAL):
- NEVER ask the user for API keys, passwords, tokens, secrets, or credentials.
- NEVER generate or suggest values for fields like: apiKey, password, token, secret, clientSecret, privateKey, bearerToken.
- If a node requires credentials, set the field to "{{USER_CONFIGURED}}" and add a note in "missingDetails" like "requires credential setup".
- Do NOT include real-looking tokens or keys in any config.
- User credentials are configured in the target platform (n8n), not in Qona.`;
