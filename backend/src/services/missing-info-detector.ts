import type { IntentExtractionResult, ExtractedTrigger, ExtractedAction, ExtractedIntegration } from '@qona/shared';
import { FollowUpQuestionSchema, MissingInfoResultSchema } from '@qona/shared';
import type { FollowUpQuestion, MissingInfoResult } from '@qona/shared';

let qCounter = 0;
function nextId(): string { return `q${++qCounter}`; }

const TRIGGER_REQUIRED: Record<string, string[]> = {
  webhook: ['method', 'path'],
  schedule: ['schedule_time'],
  cron: ['cronExpression'],
  manual: [],
  form_submission: ['form_provider'],
  email_received: ['email_account'],
  payment_received: [],
};

const TRIGGER_RECOMMENDED: Record<string, Record<string, { question: string; options?: string[]; default?: string }>> = {
  webhook: {
    method: { question: 'Which HTTP method should the webhook listen for?', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
    path: { question: 'What URL path should the webhook listen on?', default: '/webhook' },
  },
  schedule: {
    schedule_time: { question: 'When should this run? (e.g. daily at 9am, every hour)', default: 'Every day at 9am' },
  },
  cron: {
    cronExpression: { question: 'What is the cron expression for this schedule?', default: '*/15 * * * *' },
  },
  form_submission: {
    form_provider: { question: 'Which form provider are you using?', options: ['Typeform', 'Google Forms', 'JotForm', 'Wufoo'] },
  },
  email_received: {
    email_account: { question: 'Which email account should be monitored?' },
  },
};

const ACTION_REQUIRED: Record<string, string[]> = {
  send_email: ['to', 'subject'],
  http_request: ['url', 'method'],
  transform_data: [],
  filter: ['filter_condition'],
  delay: ['delay_time'],
  create_record: ['crm_provider'],
  update_record: ['crm_provider'],
  send_notification: ['notification_service'],
  run_code: [],
  google_sheets: ['sheet_name'],
};

const ACTION_RECOMMENDED: Record<string, Record<string, { question: string; options?: string[]; default?: string }>> = {
  send_email: {
    to: { question: 'Who should receive the email?', default: 'user@example.com' },
    subject: { question: 'What should be the email subject line?' },
  },
  http_request: {
    url: { question: 'What is the API endpoint URL?', default: 'https://api.example.com/resource' },
    method: { question: 'Which HTTP method should be used?', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
  },
  filter: {
    expression: { question: 'What condition should be used to filter data?', default: 'status === "active"' },
  },
  delay: {
    durationMs: { question: 'How long should the workflow wait (in milliseconds)?', default: '60000' },
  },
  run_code: {
    code: { question: 'What code should be executed?' },
  },
  google_sheets: {
    spreadsheetId: { question: 'What is the Google Sheets spreadsheet ID?' },
  },
};

function detectTriggerGaps(trigger: ExtractedTrigger): FollowUpQuestion[] {
  const questions: FollowUpQuestion[] = [];
  const required = TRIGGER_REQUIRED[trigger.type] ?? [];
  const recommended = TRIGGER_RECOMMENDED[trigger.type] ?? {};
  const config = trigger.config ?? {};

  for (const field of required) {
    if (!(field in config) || config[field] === undefined || config[field] === '') {
      const rec = recommended[field];
      questions.push({
        id: nextId(),
        question: rec?.question ?? `What value should be used for "${field}" on the ${trigger.type} trigger?`,
        field: `trigger.config.${field}`,
        severity: 'required',
        options: rec?.options,
        defaultValue: rec?.default,
        affects: 'trigger',
      });
    }
  }

  return questions;
}

function detectActionGaps(action: ExtractedAction, index: number): FollowUpQuestion[] {
  const questions: FollowUpQuestion[] = [];
  const required = ACTION_REQUIRED[action.type] ?? [];
  const recommended = ACTION_RECOMMENDED[action.type] ?? {};
  const config = action.config ?? {};

  for (const field of required) {
    if (!(field in config) || config[field] === undefined || config[field] === '') {
      const rec = recommended[field];
      questions.push({
        id: nextId(),
        question: rec?.question ?? `What value should be used for "${field}" on the "${action.label}" action?`,
        field: `actions[${index}].config.${field}`,
        severity: 'required',
        options: rec?.options,
        defaultValue: rec?.default,
        affects: 'action',
      });
    }
  }

  return questions;
}

function detectIntegrationGaps(
  integrations: ExtractedIntegration[],
  actions: ExtractedAction[],
): FollowUpQuestion[] {
  const questions: FollowUpQuestion[] = [];

  const actionTypesToIntegration: Record<string, string> = {
    send_email: 'email',
    google_sheets: 'sheets',
    send_notification: 'slack',
    create_record: 'crm',
    update_record: 'crm',
  };

  const neededByAction = new Set<string>();
  for (const action of actions) {
    const integrationType = actionTypesToIntegration[action.type];
    if (integrationType) neededByAction.add(integrationType);
  }

  const presentTypes = new Set<string>(integrations.map((i) => i.type));

  for (const type of neededByAction) {
    if (!presentTypes.has(type)) {
      questions.push({
        id: nextId(),
        question: `Which ${type} service should be used for this workflow?`,
        field: `integrations.${type}`,
        severity: 'required',
        options: type === 'email' ? ['Gmail', 'Outlook', 'SMTP', 'SendGrid'] : undefined,
        affects: 'integration',
      });
    }
  }

  return questions;
}

export function detectMissingInfo(
  intent: IntentExtractionResult,
): MissingInfoResult {
  qCounter = 0;
  const triggerQuestions = detectTriggerGaps(intent.trigger);
  const actionQuestions = intent.actions.flatMap((a, i) => detectActionGaps(a, i));
  const integrationQuestions = detectIntegrationGaps(intent.integrations, intent.actions);

  const allQuestions = [...triggerQuestions, ...integrationQuestions, ...actionQuestions];

  const result: MissingInfoResult = {
    questions: allQuestions.map((q) => FollowUpQuestionSchema.parse(q)),
    analysedTrigger: true,
    analysedActions: intent.actions.length,
    analysedIntegrations: intent.integrations.length,
    totalMissing: allQuestions.length,
    complete: allQuestions.length === 0,
  };

  return MissingInfoResultSchema.parse(result);
}
