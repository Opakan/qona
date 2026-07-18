import type { IntentExtractionResult } from '@qona/shared';
import { FollowUpQuestionSchema, MissingInfoResultSchema } from '@qona/shared';
import type { MissingInfoResult } from '@qona/shared';
import { buildInitialPlan } from './requirement-collector.js';

export function detectMissingInfo(
  intent: IntentExtractionResult,
): MissingInfoResult {
  const plan = buildInitialPlan(intent, 'Dummy Goal');
  const questions = plan.questions;

  const result: MissingInfoResult = {
    questions: questions.map((q) => FollowUpQuestionSchema.parse(q)),
    analysedTrigger: true,
    analysedActions: intent.actions.length,
    analysedIntegrations: intent.integrations.length,
    totalMissing: questions.length,
    complete: questions.length === 0,
  };

  return MissingInfoResultSchema.parse(result);
}
