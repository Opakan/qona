import { chatCompletion } from './deepseek.js';
import { AI_PROMPTS } from './ai-prompts.js';
import { conversationService } from './conversation.service.js';
import { planningSessionService } from './planning-session.js';
import { draftBuilderService } from './draft-builder.js';
import { checkWorkflowCompleteness } from './workflow-safety.js';
import { extractIntent } from './intent-extractor.js';
import { detectMissingInfo } from './missing-info-detector.js';
import { getPrisma } from '../lib/prisma.js';
import {
  AIClarificationResponseSchema,
  InternalGraphSchema,
  validateInternalGraph,
  PLANNING_STATES,
} from '@qona/shared';
import type { InternalGraph, PlanningMissingField } from '@qona/shared';
import type { Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════
// Logger
// ═══════════════════════════════════════════════════════

const LOG_PREFIX = '[Qona AI]';

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const line = `${LOG_PREFIX} ${level.toUpperCase()} [${ts}] ${message}`;
  const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  logger(line, data ? JSON.stringify(truncateLogData(data)) : '');
}

function truncateLogData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string' && v.length > 600) result[k] = v.slice(0, 600) + `... [truncated]`;
    else if (typeof v === 'object' && v !== null) {
      const s = JSON.stringify(v);
      result[k] = s.length > 600 ? s.slice(0, 600) + '... [truncated]' : v;
    } else result[k] = v;
  }
  return result;
}

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

export interface AIResponse {
  type: 'question' | 'clarification' | 'workflow' | 'complete' | 'error';
  questions?: Array<{ id: string; question: string; field?: string; options?: string[]; required: boolean }>;
  singleQuestion?: { id: string; question: string; field: string; options?: string[]; required: boolean };
  graph?: InternalGraph;
  graphId?: string;
  sessionId?: string;
  sessionState?: string;
  explanation?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════
// Safe JSON parser
// ═══════════════════════════════════════════════════════

async function parseAIResponse(rawContent: string | null | undefined, userMessage: string, allowRetry: boolean): Promise<Record<string, unknown>> {
  if (!rawContent || rawContent.trim().length === 0) throw new Error('Empty response from DeepSeek');

  log('info', 'Received raw AI response', { responseLength: rawContent.length, responsePreview: rawContent.slice(0, 300) });

  try {
    const parsed = JSON.parse(rawContent);
    log('info', 'Parsed AI response', { type: parsed.type as string ?? 'unknown' });
    return parsed;
  } catch (parseErr) {
    const errMsg = parseErr instanceof Error ? parseErr.message : 'Unknown parse error';
    log('error', 'Failed to parse AI response as JSON', { parseError: errMsg, rawPreview: rawContent.slice(0, 400) });
    if (!allowRetry) throw new Error(`Invalid JSON from AI: ${errMsg}`);

    log('info', 'Retrying with strict JSON instruction');
    try {
      const retryContent = await chatCompletion([
        { role: 'system', content: 'You are a JSON-only API. Return ONLY a valid JSON object.' },
        { role: 'user', content: `The user said: "${userMessage}"\n\nReturn a valid JSON object with "type" set appropriately.` },
      ], { temperature: 0.1, max_tokens: 4000, retries: 1 });
      if (!retryContent || retryContent.trim().length === 0) throw new Error('Retry returned empty response');
      return JSON.parse(retryContent);
    } catch (retryErr) {
      log('error', 'Retry also failed', { error: (retryErr as Error).message });
      throw new Error('AI response was not valid JSON after retry. Please try again.');
    }
  }
}

// ═══════════════════════════════════════════════════════
// Conversation Engine
// ═══════════════════════════════════════════════════════

export const conversationEngine = {
  async processMessage(
    conversationId: string,
    userId: string,
    userMessage: string,
  ): Promise<AIResponse> {
    const conversation = await conversationService.getById(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    await conversationService.addMessage(conversationId, { role: 'user', content: userMessage });

    // ── Get or create planning session ──
    let session = await planningSessionService.getActiveForUser(userId);
    if (!session) {
      session = await planningSessionService.create(userId, conversationId);
      log('info', 'Created new planning session', { sessionId: session.id });
    }

    const state = session.state;
    log('info', 'Processing message with planning session', { sessionId: session.id, state, stage: session.stage });

    // ── Route based on current state ──
    switch (state) {
      case PLANNING_STATES.COLLECTING_INTENT:
        return await this.handleCollectingIntent(session.id, userMessage, conversationId);

      case PLANNING_STATES.CLARIFYING:
        return await this.handleClarifying(session.id, userMessage, conversationId, userId);

      case PLANNING_STATES.GENERATING_GRAPH:
        return await this.handleGeneratingGraph(session.id, userMessage, conversationId, userId);

      default:
        return {
          type: 'error',
          error: `Session is in state "${state}". Start a new conversation.`,
          sessionId: session.id,
          sessionState: state,
        };
    }
  },

  // ═══════════════════════════════════════════════════════
  // State handlers
  // ═══════════════════════════════════════════════════════

  async handleCollectingIntent(
    sessionId: string,
    userMessage: string,
    conversationId: string,
  ): Promise<AIResponse> {
    log('info', 'Extracting intent from initial prompt');

    try {
      const intent = await extractIntent(userMessage);
      await planningSessionService.setExtractedIntent(sessionId, intent);
    } catch {
      log('warn', 'Intent extraction failed, using fallback');
    }

    const gaps = detectMissingInfo({
      trigger: { type: 'webhook', label: 'Webhook', description: 'Receives external requests' },
      actions: [{ type: 'send_email', label: 'Action', description: 'Processes data', order: 1 }],
      integrations: [],
      confidence: 0.5,
      missingDetails: [],
    });

    const fields: PlanningMissingField[] = gaps.questions.map((q) => ({
      field: q.field,
      question: q.question,
      severity: q.severity,
      answered: false,
    }));

    if (fields.length === 0) {
      fields.push(
        { field: 'trigger_type', question: 'What should trigger this workflow?', severity: 'required', answered: false },
        { field: 'action_0', question: 'What action should the workflow perform?', severity: 'required', answered: false },
      );
    }

    await planningSessionService.setMissingFields(sessionId, fields);
    await planningSessionService.transition(sessionId, PLANNING_STATES.CLARIFYING);

    const firstField = fields[0];
    const question = await this.askNextQuestion(sessionId, firstField, userMessage);

    await conversationService.addMessage(conversationId, {
      role: 'assistant',
      content: question.question,
      metadata: { question, sessionId, sessionState: PLANNING_STATES.CLARIFYING },
    });

    return {
      type: 'question',
      singleQuestion: question,
      sessionId,
      sessionState: PLANNING_STATES.CLARIFYING,
    };
  },

  async handleClarifying(
    sessionId: string,
    userMessage: string,
    conversationId: string,
    userId: string,
  ): Promise<AIResponse> {
    const session = await planningSessionService.getById(sessionId);
    if (!session) throw new Error('Session not found');

    const missingFields = (session.missingFields as PlanningMissingField[]) ?? [];
    const currentField = missingFields.find((f) => !f.answered);

    if (!currentField) {
      await planningSessionService.transition(sessionId, PLANNING_STATES.GENERATING_GRAPH);
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: "I have everything I need. Let me stop here — I'll generate the workflow when you're ready.",
        metadata: { sessionId, sessionState: PLANNING_STATES.GENERATING_GRAPH },
      });
      return {
        type: 'complete',
        sessionId,
        sessionState: PLANNING_STATES.GENERATING_GRAPH,
        explanation: 'All information collected. Ready to generate the workflow.',
      };
    }

    await planningSessionService.addAnswer(sessionId, {
      questionId: currentField.field,
      field: currentField.field,
      value: userMessage,
    });

    await draftBuilderService.buildDraft(sessionId);

    const refreshed = await planningSessionService.getById(sessionId);
    const refreshedFields = (refreshed!.missingFields as PlanningMissingField[]) ?? [];
    const nextField = refreshedFields.find((f) => !f.answered);

    if (!nextField) {
      await planningSessionService.transition(sessionId, PLANNING_STATES.GENERATING_GRAPH);
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: "I have everything I need. Your workflow is ready to generate.",
        metadata: { sessionId, sessionState: PLANNING_STATES.GENERATING_GRAPH },
      });
      return {
        type: 'complete',
        sessionId,
        sessionState: PLANNING_STATES.GENERATING_GRAPH,
        explanation: 'All questions answered. Ready to proceed.',
      };
    }

    const question = await this.askNextQuestion(sessionId, nextField, userMessage);

    await conversationService.addMessage(conversationId, {
      role: 'assistant',
      content: question.question,
      metadata: { question, sessionId, sessionState: PLANNING_STATES.CLARIFYING },
    });

    return {
      type: 'question',
      singleQuestion: question,
      sessionId,
      sessionState: PLANNING_STATES.CLARIFYING,
    };
  },

  async handleGeneratingGraph(
    sessionId: string,
    userMessage: string,
    conversationId: string,
    userId: string,
  ): Promise<AIResponse> {
    const triggerWords = ['generate', 'proceed', 'yes', 'go ahead', "let's go", 'create it', 'build it', 'finalize', 'do it', 'go', 'ok', 'okay'];
    const shouldGenerate = triggerWords.some((w) => userMessage.toLowerCase().includes(w));

    if (!shouldGenerate) {
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: 'Ready to generate your workflow. Just say "generate" or "proceed" when you\'re ready.',
        metadata: { sessionId, sessionState: PLANNING_STATES.GENERATING_GRAPH },
      });
      return {
        type: 'complete',
        sessionId,
        sessionState: PLANNING_STATES.GENERATING_GRAPH,
        explanation: 'Waiting for user to confirm generation.',
      };
    }

    log('info', 'Starting workflow finalization', { sessionId });

    const session = await planningSessionService.getById(sessionId);
    if (!session) throw new Error('Session not found');

    const missingFields = (session.missingFields as PlanningMissingField[]) ?? [];
    const unanswered = missingFields.filter((f) => !f.answered);

    if (unanswered.length > 0) {
      log('warn', 'Attempted to generate with unanswered fields', { unanswered: unanswered.map((f) => f.field) });
      await planningSessionService.transition(sessionId, PLANNING_STATES.CLARIFYING);
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: `Before I can generate the workflow, I still need to know about: ${unanswered.map((f) => f.question).join(', ')}.`,
        metadata: { sessionId, sessionState: PLANNING_STATES.CLARIFYING },
      });
      const nextField = unanswered[0];
      const question = await this.askNextQuestion(sessionId, nextField, userMessage);
      return {
        type: 'question',
        singleQuestion: question,
        sessionId,
        sessionState: PLANNING_STATES.CLARIFYING,
      };
    }

    const draft = session.workflowDraft as InternalGraph | null;
    if (!draft || !draft.nodes || draft.nodes.length === 0) {
      throw new Error('Workflow draft is empty — cannot generate');
    }

    log('info', 'Draft validated — generating final workflow', { nodeCount: draft.nodes.length, edgeCount: draft.edges.length });

    await planningSessionService.transition(sessionId, PLANNING_STATES.COMPILING);

    const safety = checkWorkflowCompleteness({ draft, missingFields });
    if (!safety.safe) {
      log('warn', 'Final workflow validation failed', { errors: safety.errors });
      await planningSessionService.transition(sessionId, PLANNING_STATES.CLARIFYING);
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: `The workflow draft has some issues: ${safety.errors.join('; ')}. Let me ask you to fix them.`,
        metadata: { sessionId, sessionState: PLANNING_STATES.CLARIFYING },
      });
      return {
        type: 'clarification',
        questions: safety.errors.map((e, i) => ({ id: `fix-${i}`, question: e, field: e, required: true })),
        sessionId,
        sessionState: PLANNING_STATES.CLARIFYING,
      };
    }

    const prisma = getPrisma();
    const saved = await prisma.internalGraph.create({
      data: {
        userId,
        name: draft.metadata.name,
        description: draft.metadata.description,
        version: draft.metadata.version,
        nodes: draft.nodes as Prisma.InputJsonValue,
        edges: draft.edges as Prisma.InputJsonValue,
        metadata: draft.metadata as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
    });

    await planningSessionService.linkGraph(sessionId, saved.id);
    await planningSessionService.transition(sessionId, PLANNING_STATES.COMPLETED);

    log('info', 'Workflow finalized and saved', { graphId: saved.id, nodeCount: draft.nodes.length });

    await conversationService.addMessage(conversationId, {
      role: 'assistant',
      content: `Your workflow "${draft.metadata.name}" has been generated and saved. Here's what was built:`,
      metadata: { graphId: saved.id, sessionId, sessionState: PLANNING_STATES.COMPLETED },
    });

    return {
      type: 'workflow',
      graph: draft,
      graphId: saved.id,
      sessionId,
      sessionState: PLANNING_STATES.COMPLETED,
      explanation: `Workflow "${draft.metadata.name}" generated with ${draft.nodes.length} nodes and ${draft.edges.length} connections.`,
    };
  },

  // ═══════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════

  async askNextQuestion(
    sessionId: string,
    field: PlanningMissingField,
    userContext: string,
  ): Promise<{ id: string; question: string; field: string; options?: string[]; required: boolean }> {
    const session = await planningSessionService.getById(sessionId);
    const answers = (session?.collectedAnswers as Array<{ questionId: string; field: string; value: string }>) ?? [];
    const missing = (session?.missingFields as PlanningMissingField[]) ?? [];

    const collectedSummary = answers.map((a) => `${a.field}: ${a.value}`).join('\n');
    const missingSummary = missing.filter((f) => !f.answered).map((f) => `- ${f.question}`).join('\n');

    const prompt = AI_PROMPTS.ASK_SINGLE_QUESTION
      .replace('{{collectedAnswers}}', collectedSummary || 'none yet')
      .replace('{{missingFields}}', missingSummary)
      .replace('{{nextField}}', `${field.question} (field: ${field.field})`);

    try {
      const raw = await chatCompletion([
        { role: 'system', content: prompt },
        { role: 'user', content: `Context: ${userContext}\n\nAsk your single question now.` },
      ], { temperature: 0.7, max_tokens: 500, retries: 1 });

      const parsed = await parseAIResponse(raw, userContext, false);

      if (parsed.type === 'question' && parsed.question) {
        return parsed.question as { id: string; question: string; field: string; options?: string[]; required: boolean };
      }

      return {
        id: field.field,
        question: field.question,
        field: field.field,
        required: field.severity === 'required',
      };
    } catch {
      return {
        id: field.field,
        question: field.question,
        field: field.field,
        required: field.severity === 'required',
      };
    }
  },

  // ═══════════════════════════════════════════════════════
  // Legacy: rapid generation (not used in multi-step flow)
  // ═══════════════════════════════════════════════════════

  async callAI(userMessage: string, collectedFields: Record<string, string> = {}): Promise<AIResponse> {
    let userContent = userMessage;
    if (Object.keys(collectedFields).length > 0) {
      userContent += `\n\nAlready collected: ${JSON.stringify(collectedFields)}`;
    }

    log('info', 'Sending prompt to DeepSeek', { promptLength: userMessage.length });

    try {
      const rawContent = await chatCompletion([
        { role: 'system', content: AI_PROMPTS.GENERATE_WORKFLOW },
        { role: 'user', content: userContent },
      ]);

      const parsed = await parseAIResponse(rawContent, userMessage, true);

      if (parsed.type === 'clarification' && parsed.questions && Array.isArray(parsed.questions)) {
        const validated = AIClarificationResponseSchema.safeParse(parsed);
        return {
          type: 'clarification',
          questions: validated.success ? validated.data.questions : (parsed.questions as Array<{ id: string; question: string; field?: string; options?: string[]; required: boolean }>),
        };
      }

      if (parsed.type === 'workflow' && parsed.workflow) {
        const parsedGraph = InternalGraphSchema.safeParse(parsed.workflow);
        if (!parsedGraph.success) {
          return {
            type: 'clarification',
            questions: parsedGraph.error.issues.slice(0, 5).map((i, idx) => ({
              id: `schema-${idx}`, question: `${i.path.join('.')}: ${i.message}`, field: i.path.join('.'), required: true,
            })),
          };
        }

        return {
          type: 'workflow',
          graph: parsedGraph.data,
          explanation: (parsed.explanation as string) ?? 'Workflow generated.',
        };
      }

      return this.fallbackClarification(userMessage);
    } catch (err) {
      log('error', 'AI call failed', { error: (err as Error).message });
      return this.fallbackClarification(userMessage);
    }
  },

  async fallbackClarification(userMessage: string): Promise<AIResponse> {
    log('info', 'Attempting fallback clarification');
    try {
      const raw = await chatCompletion([
        { role: 'system', content: AI_PROMPTS.GET_CLARIFICATION },
        { role: 'user', content: `The user said: "${userMessage}"\n\nReturn JSON with type: clarification and a questions array.` },
      ], { max_tokens: 2000 });

      const parsed = await parseAIResponse(raw, userMessage, false);
      if (parsed.questions && Array.isArray(parsed.questions) && (parsed.questions as Array<unknown>).length > 0) {
        return { type: 'clarification', questions: parsed.questions as Array<{ id: string; question: string; field?: string; options?: string[]; required: boolean }> };
      }
      throw new Error('No questions');
    } catch {
      return {
        type: 'clarification',
        questions: [
          { id: 'q1', question: 'What should trigger this workflow? For example: a webhook, a schedule, or a manual action?', required: true },
          { id: 'q2', question: 'What action should the workflow perform? For example: send an email, call an API, update a spreadsheet?', required: true },
        ],
      };
    }
  },
};
