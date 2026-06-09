import { chatCompletion } from './deepseek.js';
import { IntentExtractionResultSchema, CREDENTIAL_GUARD_PROMPT } from '@qona/shared';
import type { IntentExtractionResult } from '@qona/shared';
import { nodeRegistry } from './node-registry.js';
import { workflowMemory } from './workflow-memory.js';

function buildPrompt(memoryContext?: string): string {
  const registryCtx = nodeRegistry.buildRegistryContext();
  const memoryBlock = memoryContext ?? '';
  return `You are Qona's intent extraction engine. Your job is to parse a user's automation request and extract structured information.

Analyze the user's prompt and return a JSON object in this EXACT format:

{
  "trigger": {
    "type": "<triggerNodeType>",
    "label": "Human-readable name",
    "description": "What this trigger does",
    "config": {
      "<field>": "<value>"
    }
  },
  "actions": [
    {
      "type": "<actionNodeType>",
      "label": "Human-readable name",
      "description": "What this action does",
      "order": 1,
      "config": {
        "<field>": "<value>"
      }
    }
  ],
  "integrations": [
    {
      "name": "Service Name",
      "type": "email|crm|sheets|slack|api|database|payment|storage|custom",
      "purpose": "How this integration is used"
    }
  ],
  "confidence": 0.85,
  "missingDetails": []
}

${registryCtx}

Integration type labels (for the integrations array, not node types):
- "email" — Gmail, Outlook, SMTP
- "crm" — HubSpot, Salesforce
- "sheets" — Google Sheets, Excel
- "slack" — Slack, MS Teams
- "api" — external REST/SOAP APIs
- "database" — PostgreSQL, MySQL, Supabase
- "payment" — Stripe, Paystack
- "storage" — Google Drive, Dropbox, S3
- "custom" — unspecified

Rules:
- EXACTLY one trigger node
- trigger.type MUST be one of the registered trigger nodeType values above
- action.type MUST be one of the registered action nodeType values above
- DO NOT invent new node types — use ONLY those listed above
- Order actions by execution sequence
- Set confidence based on how clear the prompt is (0-1)
- List genuinely missing details in "missingDetails"
- If the prompt is too vague, set confidence below 0.5 and list what's unclear

${CREDENTIAL_GUARD_PROMPT}

${memoryBlock}`;}

export class IntentExtractionError extends Error {
  constructor(message: string, public readonly rawResponse?: string) {
    super(message);
    this.name = 'IntentExtractionError';
  }
}

export async function extractIntent(prompt: string): Promise<IntentExtractionResult> {
  if (!prompt || prompt.trim().length === 0) {
    throw new IntentExtractionError('Prompt cannot be empty');
  }

  if (prompt.trim().length > 5000) {
    throw new IntentExtractionError('Prompt exceeds maximum length of 5000 characters');
  }

  // Fetch similar successful workflows from memory
  const memoryCtx = await workflowMemory.buildMemoryContext({
    goal: prompt.trim(),
    triggerType: '',
    actionTypes: [],
    integrationTypes: [],
  });

  const systemPrompt = buildPrompt(memoryCtx);

  const raw = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt.trim() },
    ],
    { temperature: 0.2, max_tokens: 3000, retries: 2 },
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new IntentExtractionError('DeepSeek returned invalid JSON', raw);
  }

  const result = IntentExtractionResultSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new IntentExtractionError(
      `Extraction validation failed: ${issues.join('; ')}`,
      raw,
    );
  }

  return result.data;
}
