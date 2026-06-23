import { chatCompletion } from './deepseek.js';
import { nodeRegistry } from './node-registry.js';
import { CREDENTIAL_GUARD_PROMPT } from '@qona/shared';

export interface PlannerRequirement {
  field: string;
  question: string;
}

export interface PlannerResult {
  goal: string;
  readyForGraph: boolean;
  missingRequirements: PlannerRequirement[];
}

export class WorkflowPlannerError extends Error {
  constructor(message: string, public readonly rawResponse?: string) {
    super(message);
    this.name = 'WorkflowPlannerError';
  }
}

function buildPlannerPrompt(): string {
  const registryCtx = nodeRegistry.buildRegistryContext();

  return `You are the Workflow Planner for Qona.
Your job is NOT to build workflows. Your job is to discover missing requirements.

Given a user request, determine:
1. What trigger type they need (from the AVAILABLE NODE TYPES below).
2. What action types they need (from the AVAILABLE NODE TYPES below).
3. What integrations are involved.
4. What information is MISSING — what must you ask the user before building.

Rules:
- Use ONLY the registered node types listed below.
- DO NOT invent new node types, credentials, or integrations.
- Ask business-level questions (e.g., "Which form provider are you using?") not technical configuration.
- Each missingRequirement must have a clear, single-sentence question.
- If the user's prompt provides EVERYTHING needed, set readyForGraph: true and return an empty missingRequirements array.

${registryCtx}

${CREDENTIAL_GUARD_PROMPT}

Respond with ONLY this JSON structure:

{
  "goal": "<concise 1-line summary>",
  "readyForGraph": false,
  "missingRequirements": [
    {
      "field": "form_provider",
      "question": "Which form provider are you using?"
    },
    {
      "field": "recipient_email",
      "question": "Who should receive the email?"
    }
  ]
}`;
}

export async function planWorkflow(prompt: string): Promise<PlannerResult> {
  if (!prompt || prompt.trim().length === 0) {
    throw new WorkflowPlannerError('Prompt cannot be empty');
  }

  if (prompt.trim().length > 5000) {
    throw new WorkflowPlannerError('Prompt exceeds maximum length of 5000 characters');
  }

  const systemPrompt = buildPlannerPrompt();

  const raw = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt.trim() },
    ],
    { temperature: 0.2, max_tokens: 2000, retries: 2 },
  );

  let parsed: {
    goal?: string;
    readyForGraph?: boolean;
    missingRequirements?: Array<{ field: unknown; question: unknown }>;
  };

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new WorkflowPlannerError('DeepSeek returned invalid JSON', raw);
  }

  if (!parsed.goal || typeof parsed.goal !== 'string') {
    throw new WorkflowPlannerError('Planner response missing goal field', raw);
  }

  const missingRequirements: PlannerRequirement[] = (parsed.missingRequirements ?? [])
    .filter((r) => typeof r.field === 'string' && typeof r.question === 'string')
    .map((r) => ({
      field: r.field as string,
      question: r.question as string,
    }));

  return {
    goal: parsed.goal,
    readyForGraph: parsed.readyForGraph ?? (missingRequirements.length === 0),
    missingRequirements,
  };
}
