import { chatCompletion } from './bedrock.js';
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
import { resolveUserId } from './user-sync.js';
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
  if (!rawContent || rawContent.trim().length === 0) throw new Error('Empty response from AWS Bedrock');

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
  return resolveUserId(authId, email, name);
}

// ═══════════════════════════════════════════════════════
// Friendly Workflow Explanation Generator
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// Friendly Workflow Explanation Generator
// ═══════════════════════════════════════════════════════

async function generateFriendlyWorkflowExplanation(
  userPrompt: string,
  plan: WorkflowPlan,
  nextQuestionText?: string,
): Promise<string> {
  const systemPrompt = `You are Qonace AI, an expert, friendly automation architect powered by Claude Sonnet.
Your mission is to help NON-TECHNICAL users easily understand and build automations for n8n.

Formatting & Architecture Guidelines:
1. Tone: Warm, highly encouraging, structured, and crystal clear (like an elite AI automation consultant).
2. Architecture Breakdown:
   - Provide a clean ASCII / Markdown visual flow pipeline (e.g., Input Trigger ↓ Download Audio ↓ Speech-to-Text ↓ AI Cleanup & Intelligence ↓ Multi-Channel Branches ↓ Destinations).
   - Walk through the pipeline in clear, numbered sections.
3. Demystify technical concepts in plain English for beginners:
   - **⚡ Trigger (When something happens...)**: Explain the starting event (e.g. *when a new podcast audio or URL is submitted via webhook / upload*) in friendly terms.
   - **⚙️ Actions (Do something with another app...)**: Explain the automated steps that follow (e.g. *transcribing audio with AI, cleaning the transcript, structured data extraction, generating show notes, summaries, social media posts, and saving to Notion, Google Drive, or Email*).
4. Outline the practical value (e.g. how it turns 1 piece of content into 10 multi-channel assets or saves hours of manual work).
5. **🔑 3rd-Party Setup & Requirements Guide (Step-by-Step)**:
   - For EVERY third-party service involved (e.g. Stripe, Slack, Notion, OpenAI, Google Sheets, HubSpot, Discord, Twilio, Airtable, etc.):
   - Teach the user step-by-step how to obtain any required API Keys, Webhooks, Client Secrets, or IDs directly from the third-party website (e.g. *"1. Log in to dashboard.stripe.com ➔ Click Developers ➔ API keys ➔ Copy Secret key"*).
   - Give exact click paths so non-technical users never feel confused about where to find credentials.
6. Conclude with a helpful, friendly question or next step.`;

  try {
    const summary = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `The user requested: "${userPrompt}"\n\nProposed Plan:\n- Goal: ${plan.goal}\n- Trigger: ${plan.trigger?.label || plan.trigger?.type}\n- Actions: ${plan.actions.map((a) => a.label || a.type).join(' ➔ ')}\n- Integrations: ${plan.integrations.map((i) => i.name).join(', ')}\n\nNext clarifying question / prompt: "${nextQuestionText || 'How would you like to customize or generate this workflow?'}"\n\nWrite a comprehensive, engaging response for the user explaining the complete architecture, demystifying Trigger & Action in plain English, and asking the question.`,
        },
      ],
      { temperature: 0.3, max_tokens: 2000, retries: 1, modelTier: 'sonnet' },
    );
    return summary;
  } catch {
    return `### 🚀 Automated Workflow Architecture for: "${plan.goal}"

Here is how we can build this automation for you:

\`\`\`text
[Input Trigger] 
       ↓
[Process Data / Audio] 
       ↓
[AI Intelligence & Formatting]
       ↓
 ┌──────────────┬──────────────┬──────────────┐
 ↓              ↓              ↓              ↓
[Show Notes]   [Summaries]   [Social Posts] [Action Items]
 └──────────────┴──────────────┴──────────────┘
       ↓
[Save to Google Drive / Notion / Slack / Email]
\`\`\`

**⚡ 1. The Trigger (When something happens...)**
- **${plan.trigger?.label || 'Starting Event'}**: Kicks off the workflow automatically whenever new input or a webhook is received.

**⚙️ 2. The Actions (Do something with another app...)**
${plan.actions.map((a, i) => `- **Step ${i + 1} (${a.label || a.type})**: ${a.description || 'Processes and transforms your data'}`).join('\n')}

---

${nextQuestionText || 'Would you like to customize any steps, or shall I compile and export this n8n workflow?'}`;
  }
}

function isConfirmationToGenerate(text: string): boolean {
  const triggerWords = ['generate', 'proceed', 'yes', 'go ahead', "let's go", 'create it', 'build it', 'finalize', 'do it', 'go', 'compile it', 'build workflow', 'export', 'build & export n8n workflow', 'build & export'];
  const msg = text.toLowerCase().trim();
  if (triggerWords.includes(msg)) return true;
  return triggerWords.some((w) => {
    const idx = msg.indexOf(w);
    if (idx === -1) return false;
    const before = idx > 0 ? msg[idx - 1] : ' ';
    const after = idx + w.length < msg.length ? msg[idx + w.length] : ' ';
    return (/\s|[.,!?;]/.test(before)) && (/\s|[.,!?;]/.test(after));
  });
}

function isNewWorkflowIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const starterOptions = [
    'ai podcast summarizer & enhancer',
    'ai podcast summarizer and enhancer',
    'customer support & ticket auto-responder',
    'customer support and ticket auto-responder',
    'new lead / payment notifications',
    'daily database / google sheets summary',
    'daily database digest',
    'stripe payment to slack',
    'email lead auto-responder',
    'telegram webhook bot',
  ];
  if (starterOptions.some((opt) => lower.includes(opt))) return true;
  if (lower.startsWith('how to create') || lower.startsWith('how to build') || lower.startsWith('create an') || lower.startsWith('create a') || lower.startsWith('build a') || lower.startsWith('set up a')) return true;
  if (text.length > 35 && (lower.includes('workflow') || lower.includes('automate') || lower.includes('n8n') || lower.includes('podcast') || lower.includes('summarizer') || lower.includes('responder'))) return true;
  return false;
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
    email?: string,
    name?: string,
  ): Promise<AIResponse> {
    _traceId = traceId;
    try {
      const existingConv = await conversationService.getById(conversationId);
      if (!existingConv) {
        const newConv = await conversationService.create({
          authId,
          email,
          name,
          title: userMessage.slice(0, 80) || 'New conversation',
        });
        conversationId = newConv.id;
      }

      await conversationService.addMessage(conversationId, { role: 'user', content: userMessage });

      // ── Get or create planning session scoped to this conversation ──
      let session = await planningSessionService.getActiveForConversation(conversationId, authId, email, name);
      if (!session) {
        session = await planningSessionService.create(authId, conversationId, email, name);
        log('info', 'Created new planning session', { sessionId: session.id, conversationId });
      }

      const state = session.state;
      log('info', 'CONVERSATION RECEIVED', { sessionId: session.id, state, stage: session.stage, userMessage: userMessage.slice(0, 100) });

      // ── Check if user is greeting / saying hello ──
      const isGreeting = /^(hi|hello|hey|greetings|help|start|good (morning|afternoon|evening)|yo)[\s!.?]*$/i.test(userMessage.trim().toLowerCase());
      if (isGreeting) {
        if (session.state !== PLANNING_STATES.COLLECTING_INTENT) {
          await planningSessionService.transition(session.id, PLANNING_STATES.COLLECTING_INTENT);
        }
        return await this.handleCollectingIntent(session.id, userMessage, conversationId);
      }

      // ── Check if user wants to generate directly ──
      if (isConfirmationToGenerate(userMessage)) {
        return await this.handleGeneratingGraph(session.id, userMessage, conversationId, authId);
      }

      // ── Check if user is asking for a new workflow or choosing a starter card ──
      if (isNewWorkflowIntent(userMessage)) {
        if (session.state !== PLANNING_STATES.COLLECTING_INTENT) {
          await planningSessionService.transition(session.id, PLANNING_STATES.COLLECTING_INTENT);
        }
        return await this.handleCollectingIntent(session.id, userMessage, conversationId);
      }

      // ── Route based on current state ──
      switch (state) {
        case PLANNING_STATES.COLLECTING_INTENT:
          return await this.handleCollectingIntent(session.id, userMessage, conversationId);

        case PLANNING_STATES.CLARIFYING:
          return await this.handleClarifying(session.id, userMessage, conversationId, authId);

        case PLANNING_STATES.GENERATING_GRAPH:
          return await this.handleGeneratingGraph(session.id, userMessage, conversationId, authId);

        default:
          return await this.handleCollectingIntent(session.id, userMessage, conversationId);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      log('error', 'Unhandled error in processMessage', { error: errMsg });
      const friendlyHelp = `I'm ready to build your automation! What apps or triggers would you like to connect? (e.g. *"When a Stripe payment succeeds, send a Slack message"* or *"AI Podcast Summarizer"*).`;
      try {
        await conversationService.addMessage(conversationId, {
          role: 'assistant',
          content: friendlyHelp,
          metadata: { error: errMsg },
        });
      } catch { /* ignore message add error */ }

      return {
        type: 'question',
        explanation: friendlyHelp,
        singleQuestion: {
          id: 'q_starter_goal',
          question: 'What workflow would you like to build?',
          field: 'workflow_goal',
          options: [
            'AI Podcast Summarizer & Enhancer',
            'Customer Support & Ticket Auto-Responder',
            'New Lead / Payment Notifications (Slack/Email)',
            'Daily Database / Google Sheets Summary',
          ],
          required: true,
        },
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

    const isSimpleGreeting = /^(hi|hello|hey|greetings|help|start|good (morning|afternoon|evening)|yo)[\s!.?]*$/i.test(userMessage.trim().toLowerCase());
    if (isSimpleGreeting) {
      const greetingText = `Hello! 👋 I'm **Qonace AI**, your workflow automation assistant.\n\nTell me what workflow or repetitive task you'd like to automate (e.g. *"Sync Stripe payments to Slack"* or *"AI Podcast Summarizer & Enhancer"*), and I'll design and build the complete n8n automation for you!`;
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: greetingText,
        metadata: { sessionId, sessionState: 'collecting_intent' },
      });
      return {
        type: 'question',
        sessionId,
        sessionState: 'collecting_intent',
        explanation: greetingText,
        singleQuestion: {
          id: 'q_starter_goal',
          question: 'What workflow would you like to build today?',
          field: 'workflow_goal',
          options: [
            'AI Podcast Summarizer & Enhancer',
            'Customer Support & Ticket Auto-Responder',
            'New Lead / Payment Notifications (Slack/Email)',
            'Daily Database / Google Sheets Summary',
          ],
          required: true,
        },
      };
    }

    let intent;

    try {
      intent = await extractIntent(userMessage);
      log('info', 'Intent extracted', { trigger: intent.trigger.type, actions: intent.actions.length, confidence: intent.confidence });
    } catch (err) {
      log('warn', 'Intent extraction failed', { error: (err as Error).message });
      const friendlyHelp = `I'd love to help you build that! Could you tell me a bit more about what apps you want to connect and what the automation should do?`;

      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: friendlyHelp,
        metadata: { sessionId, sessionState: 'collecting_intent' },
      });
      return {
        type: 'question',
        sessionId,
        sessionState: 'collecting_intent',
        explanation: friendlyHelp,
        singleQuestion: {
          id: 'q_starter_goal',
          question: 'What workflow would you like to build today?',
          field: 'workflow_goal',
          options: [
            'AI Podcast Summarizer & Enhancer',
            'Customer Support & Ticket Auto-Responder',
            'New Lead / Payment Notifications (Slack/Email)',
            'Daily Database / Google Sheets Summary',
          ],
          required: true,
        },
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

    // Build immediate visual graph
    const { graph } = buildInternalGraph(plan);

    // Dynamic smart options based on the workflow goal
    const defaultOptions = [
      'Build & Export n8n Workflow',
      'Save to Google Drive & Notion',
      'Add Slack / Email Alerts',
      'Customize AI Prompt & Models',
    ];

    // ── Check missing requirements ──
    const missing = detectMissingRequirements(plan.requirements);
    if (missing.length === 0) {
      // All requirements are auto-filled → go straight to generating
      await planningSessionService.transition(sessionId, PLANNING_STATES.GENERATING_GRAPH);
      const explanation = await generateFriendlyWorkflowExplanation(userMessage, plan, "Everything is structured and ready on your canvas! Would you like to build and export the n8n JSON?");
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: explanation,
        metadata: { graph, sessionId, sessionState: PLANNING_STATES.GENERATING_GRAPH },
      });
      return {
        type: 'workflow',
        graph,
        sessionId,
        sessionState: PLANNING_STATES.GENERATING_GRAPH,
        explanation,
        singleQuestion: {
          id: 'q_ready_to_build',
          question: 'Ready to build this workflow?',
          field: 'generate_confirmation',
          options: defaultOptions,
          required: false,
        },
      };
    }

    const firstReq = missing[0];
    const question = await generateAIQuestion(plan, firstReq);
    const richExplanation = await generateFriendlyWorkflowExplanation(userMessage, plan, question.question);

    const questionWithOptions = {
      ...planQuestionToSingleQuestion(question),
      options: question.options && question.options.length > 0 ? question.options : defaultOptions,
    };

    await conversationService.addMessage(conversationId, {
      role: 'assistant',
      content: richExplanation,
      metadata: { question: questionWithOptions, graph, sessionId, sessionState: PLANNING_STATES.CLARIFYING },
    });

    return {
      type: 'question',
      graph,
      explanation: richExplanation,
      singleQuestion: questionWithOptions,
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
      const { graph } = buildInternalGraph(plan);
      const readyMsg = "All requirements collected! Click **Build & Export n8n Workflow** or say *go ahead* to compile your workflow.";
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: readyMsg,
        metadata: { graph, sessionId, sessionState: PLANNING_STATES.GENERATING_GRAPH },
      });
      return {
        type: 'complete',
        graph,
        sessionId,
        sessionState: PLANNING_STATES.GENERATING_GRAPH,
        explanation: readyMsg,
        singleQuestion: {
          id: 'q_ready_generate',
          question: 'Ready to build?',
          field: 'generate_now',
          options: ['Build & Export n8n Workflow', 'Customize Action Steps', 'Add Email / Slack Notification'],
          required: false,
        },
      };
    }

    const currentReq = missing[0];

    // ── Collect the user's answer safely ──
    plan = collectAnswer(plan, currentReq.field, userMessage);

    // Also store in legacy format for backward compat
    await planningSessionService.addAnswer(sessionId, {
      questionId: currentReq.field,
      field: currentReq.field,
      value: userMessage,
    });

    await writePlan(sessionId, plan);

    log('info', 'Requirement collected', { field: currentReq.field, remaining: missing.length - 1 });

    // Update visual graph
    const { graph } = buildInternalGraph(plan);

    // ── Check if more requirements remain ──
    const stillMissing = detectMissingRequirements(plan.requirements);
    if (stillMissing.length === 0) {
      await planningSessionService.transition(sessionId, PLANNING_STATES.GENERATING_GRAPH);
      const completeMsg = "✨ I've updated your workflow details on the canvas! Say **'generate'** or click below to build your n8n export.";
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: completeMsg,
        metadata: { graph, sessionId, sessionState: PLANNING_STATES.GENERATING_GRAPH },
      });
      return {
        type: 'complete',
        graph,
        sessionId,
        sessionState: PLANNING_STATES.GENERATING_GRAPH,
        explanation: completeMsg,
        singleQuestion: {
          id: 'q_ready_generate_complete',
          question: 'Ready to build?',
          field: 'generate_now',
          options: ['Build & Export n8n Workflow', 'Add Another Integration', 'Edit Trigger'],
          required: false,
        },
      };
    }

    // ── Ask next question ──
    const nextReq = stillMissing[0];
    const question = await generateAIQuestion(plan, nextReq);
    const richExplanation = await generateFriendlyWorkflowExplanation(plan.goal, plan, question.question);

    const questionWithOptions = {
      ...planQuestionToSingleQuestion(question),
      options: question.options && question.options.length > 0 ? question.options : ['Build & Export n8n Workflow', 'Customize Step', 'Use Default Settings'],
    };

    await conversationService.addMessage(conversationId, {
      role: 'assistant',
      content: richExplanation,
      metadata: { question: questionWithOptions, graph, sessionId, sessionState: PLANNING_STATES.CLARIFYING },
    });

    return {
      type: 'question',
      graph,
      explanation: richExplanation,
      singleQuestion: questionWithOptions,
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
    log('info', 'STAGE: Building internal graph and compiling n8n workflow');
    await planningSessionService.transition(sessionId, PLANNING_STATES.COMPILING);

    const session = await planningSessionService.getById(sessionId);
    if (!session) throw new Error('Session not found');

    let plan = readPlan(session);
    if (!plan) {
      log('warn', 'No workflow plan found, extracting from userMessage');
      const intent = await extractIntent(userMessage);
      plan = buildInitialPlan(intent, userMessage);
      await writePlan(sessionId, plan);
    }

    // ── Build the internal graph ──
    const { graph, warnings } = buildInternalGraph(plan);

    log('info', 'Internal graph built', { nodeCount: graph.nodes.length, edgeCount: graph.edges.length, warnings: warnings.length });

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
      log('error', 'n8n compilation failed', { errors: compileResult.errors });
      const friendlyError = `We built the visual graph, but some node configurations need adjustment: ${compileResult.errors.map((e) => e.message).join('; ')}`;
      await planningSessionService.transition(sessionId, PLANNING_STATES.CLARIFYING);
      return {
        type: 'error',
        graph,
        sessionId,
        sessionState: PLANNING_STATES.CLARIFYING,
        error: friendlyError,
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

    const successMessage = `🎉 **Your n8n Automation Workflow is ready!**

### 📋 What was built:
- **Workflow Name**: ${graph.metadata.name}
- **Total Nodes**: ${compileResult.workflow.nodes.length} connected nodes
- **Trigger**: ${plan.trigger?.label || plan.trigger?.type}
- **Actions**: ${plan.actions.map((a) => a.label || a.type).join(' ➔ ')}

---
### 🚀 Next Steps:
1. Click **"Copy for n8n"** or **"Export JSON"** in the top-right toolbar.
2. In your n8n workspace, press \`Ctrl+V\` (or \`Cmd+V\`) on any empty canvas to import the complete workflow instantly!`;

    await conversationService.addMessage(conversationId, {
      role: 'assistant',
      content: successMessage,
      metadata: {
        graph,
        sessionId,
        sessionState: PLANNING_STATES.COMPLETED,
        n8nJson: compileResult.workflow,
        workflowId: workflow.id,
        exportId: exportRecord.id,
      },
    });

    return {
      type: 'complete',
      graph,
      n8nJson: compileResult.workflow,
      workflowId: workflow.id,
      exportId: exportRecord.id,
      sessionId,
      sessionState: PLANNING_STATES.COMPLETED,
      explanation: successMessage,
      singleQuestion: {
        id: 'q_post_build',
        question: 'What would you like to do next?',
        field: 'post_action',
        options: ['Create Another Workflow', 'Simulate Execution Preview', 'Upgrade to Pro'],
        required: false,
      },
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

    log('info', 'Sending prompt to AWS Bedrock', { promptLength: userMessage.length });

    try {
      const rawContent = await chatCompletion([
        { role: 'system', content: AI_PROMPTS.GENERATE_WORKFLOW },
        { role: 'user', content: userContent },
      ], { modelTier: 'sonnet' });

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
