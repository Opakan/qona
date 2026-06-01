import { chatCompletion } from './deepseek.js';
import { IntentExtractionResultSchema } from '@qona/shared';
import type { IntentExtractionResult } from '@qona/shared';

const INTENT_EXTRACTION_PROMPT = `You are Qona's intent extraction engine. Your job is to parse a user's automation request and extract structured information.

Analyze the user's prompt and return a JSON object in this EXACT format:

{
  "trigger": {
    "type": "webhook",
    "label": "Incoming Webhook",
    "description": "Receives POST requests from external services",
    "config": {
      "method": "POST"
    }
  },
  "actions": [
    {
      "type": "send_email",
      "label": "Send Welcome Email",
      "description": "Sends a welcome email to the new user",
      "order": 1,
      "config": {
        "to": "{{user.email}}",
        "subject": "Welcome to our platform!"
      }
    }
  ],
  "integrations": [
    {
      "name": "Gmail",
      "type": "email",
      "purpose": "Sending outgoing emails"
    }
  ],
  "confidence": 0.85,
  "missingDetails": []
}

Trigger types you can detect:
- "webhook" — external service calls this endpoint
- "schedule" — runs on a time schedule
- "cron" — runs on a cron expression
- "manual" — user triggers manually
- "form_submission" — triggered by a form
- "email_received" — triggered by incoming email
- "payment_received" — triggered by payment

Action types you can detect:
- "send_email" — sends an email
- "http_request" — makes an API call
- "transform_data" — transforms/processes data
- "filter" — filters data by condition
- "delay" — waits before continuing
- "create_record" — creates a database/CRM record
- "update_record" — updates a record
- "send_notification" — sends a Slack/Teams notification
- "run_code" — runs custom JavaScript/Python
- "google_sheets" — reads/writes Google Sheets

Integration types you can detect:
- "email" — Gmail, Outlook, SMTP
- "crm" — HubSpot, Salesforce, etc.
- "sheets" — Google Sheets, Excel
- "slack" — Slack, Microsoft Teams
- "api" — external REST/SOAP API
- "database" — PostgreSQL, MySQL, etc.
- "payment" — Stripe, Paystack, etc.
- "storage" — Google Drive, Dropbox, S3
- "custom" — unspecified integration

Rules:
- Always include exactly one trigger
- Order actions by execution sequence
- Set confidence based on how clear the prompt is (0-1)
- List any genuinely missing details in "missingDetails"
- If the prompt is too vague, set confidence below 0.5 and list what's unclear`;

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

  const raw = await chatCompletion(
    [
      { role: 'system', content: INTENT_EXTRACTION_PROMPT },
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
