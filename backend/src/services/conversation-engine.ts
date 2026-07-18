import { chatCompletion } from './deepseek.js';
import { AI_PROMPTS } from './ai-prompts.js';
import { conversationService } from './conversation.service.js';
import { planningSessionService } from './planning-session.js';
import { checkWorkflowCompleteness } from './workflow-safety.js';
import { extractIntent } from './intent-extractor.js';
import { buildInitialPlan, collectAnswer, generateAIQuestion, detectMissingRequirements } from './requirement-collector.js';
import { buildInternalGraph, validatePlanForGraphBuild } from './internal-graph-builder.js';
import { getPrisma } from '../lib/prisma.js';
import { validateGraph, validateGraphForCompilation, formatValidationSummary } from './graph-validator.js';
import { compileInternalGraph } from './n8n-compiler.js';
import { nodeRegistry } from './node-registry.js';
import { workflowMemory } from './workflow-memory.js';
import {
  AIClarificationResponseSchema,
  InternalGraphSchema,
  validateInternalGraph,
  PLANNING_STATES,
  WorkflowPlanSchema,
} from '@qona/shared';
import type { InternalGraph, PlanningMissingField, WorkflowPlan } from '@qona/shared';
import type { Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════
// Logger
// ═══════════════════════════════════════════════════════

const LOG_PREFIX = '[Qonace AI]';

let _traceId: string | undefined;
function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  if (_traceId) (data ??= {})[`traceId`] = _traceId;
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
  traceId?: string;
  questions?: Array<{ id: string; question: string; field?: string; options?: string[]; required: boolean }>;
  singleQuestion?: { id: string; question: string; field: string; options?: string[]; required: boolean };
  graph?: InternalGraph;
  graphId?: string;
  sessionId?: string;
  sessionState?: string;
  explanation?: string;
  error?: string;
  n8nJson?: unknown;
  workflowId?: string;
  exportId?: string;
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
// Plan helpers: serialize/deserialize workflow plan
// ═══════════════════════════════════════════════════════

function readPlan(session: { workflowDraft: unknown } | null): WorkflowPlan | null {
  if (!session?.workflowDraft) return null;
  const parsed = WorkflowPlanSchema.safeParse(session.workflowDraft);
  if (!parsed.success) return null;
  return parsed.data;
}

async function writePlan(sessionId: string, plan: WorkflowPlan): Promise<void> {
  await planningSessionService.setWorkflowDraft(sessionId, plan);
}

function planQuestionToSingleQuestion(
  q: { id: string; question: string; field: string; severity: 'required' | 'recommended'; options?: string[] },
): { id: string; question: string; field: string; options?: string[]; required: boolean } {
  return {
    id: q.id,
    question: q.question,
    field: q.field,
    options: q.options,
    required: q.severity === 'required',
  };
}

// ═══════════════════════════════════════════════════════
// Prisma userId resolver (used for FK safety)
// ═══════════════════════════════════════════════════════

async function resolvePrismaUserId(authId: string, email?: string, name?: string): Promise<string> {
  const prisma = getPrisma();
  let user = await prisma.user.findUnique({ where: { authId } });
  if (!user) {
    user = await prisma.user.create({
      data: { authId, email: email ?? authId + '@unknown', name: name ?? email ?? authId.slice(0, 8) },
    });
  }
  return user.id;
}

// ═══════════════════════════════════════════════════════
// Conversation Engine
// ═══════════════════════════════════════════════════════

export const conversationEngine = {
  async processMessage(
    conversationId: string,
    authId: string,
    userMessage: string,
    traceId?: string,
  ): Promise<AIResponse> {
    _traceId = traceId;
    const conversation = await conversationService.getById(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    await conversationService.addMessage(conversationId, { role: 'user', content: userMessage });

    // ── Get or create planning session ──
    let session = await planningSessionService.getActiveForUser(authId);
    if (!session) {
      session = await planningSessionService.create(authId, conversationId);
      log('info', 'Created new planning session', { sessionId: session.id });
    }

    const state = session.state;
    log('info', 'CONVERSATION RECEIVED', { sessionId: session.id, state, stage: session.stage });

    // ── Route based on current state ──
    switch (state) {
      case PLANNING_STATES.COLLECTING_INTENT:
        return await this.handleCollectingIntent(session.id, userMessage, conversationId);

      case PLANNING_STATES.CLARIFYING:
        return await this.handleClarifying(session.id, userMessage, conversationId, authId);

      case PLANNING_STATES.GENERATING_GRAPH:
        return await this.handleGeneratingGraph(session.id, userMessage, conversationId, authId);

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
  // STAGE 1: COLLECTING_INTENT → Extract intent → Build plan
  // ═══════════════════════════════════════════════════════

  async handleCollectingIntent(
    sessionId: string,
    userMessage: string,
    conversationId: string,
  ): Promise<AIResponse> {
    log('info', 'STAGE: Extracting intent from user prompt');

    let intent;

    try {
      intent = await extractIntent(userMessage);
      log('info', 'Intent extracted', { trigger: intent.trigger.type, actions: intent.actions.length, confidence: intent.confidence });
    } catch (err) {
      log('warn', 'Intent extraction failed', { error: (err as Error).message });
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: "I couldn't understand your workflow description. Could you rephrase it? Include what should trigger the workflow and what actions it should perform.",
        metadata: { sessionId, sessionState: 'collecting_intent', error: (err as Error).message },
      });
      return {
        type: 'error',
        sessionId,
        sessionState: 'collecting_intent',
        error: `Could not parse intent: ${(err as Error).message}`,
        explanation: 'Please rephrase your workflow description with a clear trigger and action.',
      };
    }

    await planningSessionService.setExtractedIntent(sessionId, intent);

    // ── Build the WorkflowPlan from extracted intent ──
    const plan = buildInitialPlan(intent, userMessage);

    log('info', 'Plan built', {
      trigger: plan.trigger?.type,
      actionCount: plan.actions.length,
      requirementCount: plan.requirements.length,
      missingCount: detectMissingRequirements(plan.requirements).length,
    });

    await writePlan(sessionId, plan);
    await planningSessionService.transition(sessionId, PLANNING_STATES.CLARIFYING);

    // ── Ask the first question ──
    const missing = detectMissingRequirements(plan.requirements);
    if (missing.length === 0) {
      // All requirements are auto-filled → go straight to generating
      await planningSessionService.transition(sessionId, PLANNING_STATES.GENERATING_GRAPH);
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: "I understand your workflow. Let me ask: would you like to add any details, or shall I generate it now? Say 'generate' when you're ready.",
        metadata: { sessionId, sessionState: PLANNING_STATES.GENERATING_GRAPH },
      });
      return {
        type: 'complete',
        sessionId,
        sessionState: PLANNING_STATES.GENERATING_GRAPH,
        explanation: 'Intent collected. Ready to proceed.',
      };
    }

    const firstReq = missing[0];
    const question = await generateAIQuestion(plan, firstReq);

    await conversationService.addMessage(conversationId, {
      role: 'assistant',
      content: question.question,
      metadata: { question, sessionId, sessionState: PLANNING_STATES.CLARIFYING },
    });

    return {
      type: 'question',
      singleQuestion: planQuestionToSingleQuestion(question),
      sessionId,
      sessionState: PLANNING_STATES.CLARIFYING,
    };
  },

  // ═══════════════════════════════════════════════════════
  // STAGE 2: CLARIFYING → Collect requirements one at a time
  // ═══════════════════════════════════════════════════════

  async handleClarifying(
    sessionId: string,
    userMessage: string,
    conversationId: string,
    authId: string,
  ): Promise<AIResponse> {
    const session = await planningSessionService.getById(sessionId);
    if (!session) throw new Error('Session not found');

    let plan = readPlan(session);
    if (!plan) {
      log('error', 'No WorkflowPlan found in session, reconstructing');
      const intent = session.extractedIntent as Parameters<typeof buildInitialPlan>[0] | null;
      plan = buildInitialPlan(
        intent ?? {
          trigger: { type: 'webhook', label: 'Webhook', description: '' },
          actions: [{ type: 'send_email', label: 'Action', description: '', order: 1 }],
          integrations: [],
          confidence: 0.3,
          missingDetails: [],
        },
        'Rebuilt from session',
      );
    }

    // ── Find the first unanswered requirement ──
    const missing = detectMissingRequirements(plan.requirements);
    if (missing.length === 0) {
      await planningSessionService.transition(sessionId, PLANNING_STATES.GENERATING_GRAPH);
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: "I have everything I need. Say 'generate' when you're ready to build your workflow.",
        metadata: { sessionId, sessionState: PLANNING_STATES.GENERATING_GRAPH },
      });
      return {
        type: 'complete',
        sessionId,
        sessionState: PLANNING_STATES.GENERATING_GRAPH,
        explanation: 'All requirements collected.',
      };
    }

    const currentReq = missing[0];

    // ── Collect the user's answer ──
    plan = collectAnswer(plan, currentReq.field, userMessage);

    // Also store in legacy format for backward compat
    await planningSessionService.addAnswer(sessionId, {
      questionId: currentReq.field,
      field: currentReq.field,
      value: userMessage,
    });

    await writePlan(sessionId, plan);

    log('info', 'Requirement collected', { field: currentReq.field, remaining: missing.length - 1 });

    // ── Check if more requirements remain ──
    const stillMissing = detectMissingRequirements(plan.requirements);
    if (stillMissing.length === 0) {
      await planningSessionService.transition(sessionId, PLANNING_STATES.GENERATING_GRAPH);
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: "All details collected. Say 'generate' to build your workflow.",
        metadata: { sessionId, sessionState: PLANNING_STATES.GENERATING_GRAPH },
      });
      return {
        type: 'complete',
        sessionId,
        sessionState: PLANNING_STATES.GENERATING_GRAPH,
        explanation: 'All requirements collected. Ready to generate.',
      };
    }


    // ── Ask next question ──
    const nextReq = stillMissing[0];
    const question = await generateAIQuestion(plan, nextReq);

    await conversationService.addMessage(conversationId, {
      role: 'assistant',
      content: question.question,
      metadata: { question, sessionId, sessionState: PLANNING_STATES.CLARIFYING },
    });

    return {
      type: 'question',
      singleQuestion: planQuestionToSingleQuestion(question),
      sessionId,
      sessionState: PLANNING_STATES.CLARIFYING,
    };
  },

  // ═══════════════════════════════════════════════════════
  // STAGE 3: GENERATING_GRAPH → Build graph → Save → Complete
  // ═══════════════════════════════════════════════════════

  async handleGeneratingGraph(
    sessionId: string,
    userMessage: string,
    conversationId: string,
    authId: string,
  ): Promise<AIResponse> {
    const triggerWords = ['generate', 'proceed', 'yes', 'go ahead', "let's go", 'create it', 'build it', 'finalize', 'do it', 'go', 'ok', 'okay'];
    const msg = userMessage.toLowerCase();
    const shouldGenerate = triggerWords.some((w) => {
      const idx = msg.indexOf(w);
      if (idx === -1) return false;
      const before = idx > 0 ? msg[idx - 1] : ' ';
      const after = idx + w.length < msg.length ? msg[idx + w.length] : ' ';
      return (/\s|[.,!?;]/.test(before)) && (/\s|[.,!?;]/.test(after));
    });

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

    log('info', 'STAGE: Building internal graph');
    await planningSessionService.transition(sessionId, PLANNING_STATES.COMPILING);

    const session = await planningSessionService.getById(sessionId);
    if (!session) throw new Error('Session not found');

    const plan = readPlan(session);
    if (!plan) {
      throw new Error('No workflow plan found — cannot generate');
    }

    // ── Check for unanswered required questions ──
    const stillMissing = detectMissingRequirements(plan.requirements);
    if (stillMissing.length > 0) {
      log('warn', 'Still have missing requirements', { count: stillMissing.length });
      await planningSessionService.transition(sessionId, PLANNING_STATES.CLARIFYING);
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: `I still need a few more details before building. Let me ask again.`,
        metadata: { sessionId, sessionState: PLANNING_STATES.CLARIFYING },
      });
      const nextReq = stillMissing[0];
      const question = await generateAIQuestion(plan, nextReq);
      return {
        type: 'question',
        singleQuestion: planQuestionToSingleQuestion(question),
        sessionId,
        sessionState: PLANNING_STATES.CLARIFYING,
      };
    }

    // ── Validate plan before build ──
    const buildErrors = validatePlanForGraphBuild(plan);
    const criticalErrors = buildErrors.filter((e) => e.severity === 'error');
    if (criticalErrors.length > 0) {
      log('error', 'Plan validation failed', { errors: criticalErrors });
      await planningSessionService.transition(sessionId, PLANNING_STATES.CLARIFYING);
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: `There are issues with the workflow plan: ${criticalErrors.map((e) => e.message).join('; ')}. Let me ask you to fix them.`,
        metadata: { sessionId, sessionState: PLANNING_STATES.CLARIFYING },
      });
      return {
        type: 'clarification',
        questions: criticalErrors.map((e) => ({ id: `fix-${e.path}`, question: e.message, field: e.path, required: true })),
        sessionId,
        sessionState: PLANNING_STATES.CLARIFYING,
      };
    }

    // ── Build the internal graph ──
    const { graph, warnings } = buildInternalGraph(plan);

    log('info', 'Internal graph built', { nodeCount: graph.nodes.length, edgeCount: graph.edges.length, warnings: warnings.length });

    // ── VALIDATE the graph before proceeding ──
    const registeredTypes = new Set(nodeRegistry.getNodeTypes());
    const validation = validateGraphForCompilation(graph, { registeredTypes });

    log('info', 'Graph validation complete', {
      valid: validation.valid,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
      summary: validation.summary,
    });

    if (!validation.valid) {
      const summary = formatValidationSummary(validation);
      log('error', 'Graph validation FAILED', { summary, errors: validation.errors });

      await planningSessionService.transition(sessionId, PLANNING_STATES.FAILED);
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: `The workflow graph could not be built because:\n\n${summary}\n\nPlease describe your workflow again and I'll ask the right questions.`,
        metadata: { sessionId, sessionState: PLANNING_STATES.FAILED, validation },
      });
      return {
        type: 'error',
        sessionId,
        sessionState: PLANNING_STATES.FAILED,
        error: `Graph validation failed: ${validation.errors.map((e) => e.message).join('; ')}`,
      };
    }

    // ── Save the internal graph ──
    const prisma = getPrisma();
    const prismaUserId = await resolvePrismaUserId(authId);

    const saved = await prisma.internalGraph.create({
      data: {
        userId: prismaUserId,
        name: graph.metadata.name,
        description: graph.metadata.description,
        version: graph.metadata.version,
        nodes: graph.nodes as Prisma.InputJsonValue,
        edges: graph.edges as Prisma.InputJsonValue,
        metadata: graph.metadata as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
    });

    await planningSessionService.linkGraph(sessionId, saved.id);

    // ── Compile InternalGraph → n8n JSON ──
    const compileResult = compileInternalGraph(graph);
    if (!compileResult.success || !compileResult.workflow) {
      log('error', 'n8n compilation failed after validation passed', { errors: compileResult.errors });
      await planningSessionService.transition(sessionId, PLANNING_STATES.FAILED);
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: `The workflow graph was built but compilation failed. Please try again.`,
        metadata: { sessionId, sessionState: PLANNING_STATES.FAILED },
      });
      return {
        type: 'error',
        sessionId,
        sessionState: PLANNING_STATES.FAILED,
        error: `Compilation failed: ${compileResult.errors.map((e) => e.message).join('; ')}`,
      };
    }

    // ── Create Workflow draft record ──
    const workflow = await prisma.workflow.create({
      data: {
        userId: prismaUserId,
        name: graph.metadata.name,
        description: graph.metadata.description,
        definition: compileResult.workflow as unknown as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
    });

    // ── Store export record ──
    const exportRecord = await prisma.exportHistory.create({
      data: {
        userId: prismaUserId,
        workflowId: workflow.id,
        platform: 'n8n',
        format: 'json',
        status: 'SUCCESS',
        metadata: {
          nodeCount: compileResult.workflow.nodes.length,
          compiledAt: new Date().toISOString(),
          graphId: saved.id,
        } as Prisma.InputJsonValue,
      },
    });

    await planningSessionService.transition(sessionId, PLANNING_STATES.COMPLETED);

    // ── Record in workflow memory ──
    const registryTriggers = new Set(nodeRegistry.getTriggerTypes());
    const triggerNode = graph.nodes.find((n) => registryTriggers.has(n.type));
    const actionNodes = graph.nodes.filter((n) => !registryTriggers.has(n.type));

    await workflowMemory.storePattern({
      userId: prismaUserId,
      goal: plan.goal,
      triggerType: triggerNode?.type ?? 'webhook',
      triggerLabel: triggerNode?.label ?? '',
      actionTypes: actionNodes.map((n) => n.type),
      integrationTypes: (plan.integrations ?? []).map((i) => i.type),
      graph,
      confidence: plan.confidence ?? 0.8,
      success: true,
    }).catch((err) => log('warn', 'Failed to store workflow pattern', { error: (err as Error).message }));

    log('info', 'GRAPH GENERATION COMPLETED', {
      graphId: saved.id,
      workflowId: workflow.id,
      exportId: exportRecord.id,
      nodeCount: graph.nodes.length,
      n8nNodeCount: ((compileResult.workflow as unknown as Record<string, unknown>).nodes
        ? ((compileResult.workflow as unknown as Record<string, unknown>).nodes as unknown[]).length
        : 0),
    });

    await conversationService.addMessage(conversationId, {
      role: 'assistant',
      content: `Your workflow "${graph.metadata.name}" has been generated with ${graph.nodes.length} nodes and ${graph.edges.length} connections. It's been compiled to n8n JSON and saved as a draft.`,
      metadata: {
        graph, graphId: saved.id, workflowId: workflow.id, exportId: exportRecord.id,
        sessionId, sessionState: PLANNING_STATES.COMPLETED,
      },
    });

    return {
      type: 'workflow',
      graph,
      graphId: saved.id,
      sessionId,
      sessionState: PLANNING_STATES.COMPLETED,
      n8nJson: compileResult.workflow,
      workflowId: workflow.id,
      exportId: exportRecord.id,
      explanation: `Workflow "${graph.metadata.name}" generated, compiled to n8n JSON, and saved as draft.`,
    };
  },

  // ═══════════════════════════════════════════════════════
  // Helpers (preserved for backward compat)
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
          { id: 'q1', question: 'What should trigger this workflow?', required: true },
          { id: 'q2', question: 'What is the main action this workflow should perform?', required: true },
        ],
      };
    }
  },
};
