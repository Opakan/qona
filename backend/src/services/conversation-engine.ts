import { chatCompletion } from './deepseek.js';
import { AI_PROMPTS } from './ai-prompts.js';
import { conversationService } from './conversation.service.js';
import { workflowService } from './workflow.service.js';
import { generateN8nWorkflow } from './workflow-generator.js';
import type { N8nWorkflow } from './workflow-generator.js';
import { getPrisma } from '../lib/prisma.js';
import { AIClarificationResponseSchema } from '@qona/shared';
import type { WorkflowDefinition } from '@qona/shared';

export interface AIResponse {
  type: 'clarification' | 'workflow' | 'error';
  questions?: Array<{ id: string; question: string; field?: string; options?: string[]; required: boolean }>;
  workflow?: WorkflowDefinition;
  explanation?: string;
  n8nWorkflow?: N8nWorkflow;
  error?: string;
}

export const conversationEngine = {
  async processMessage(
    conversationId: string,
    userId: string,
    userMessage: string,
  ): Promise<AIResponse> {
    const conversation = await conversationService.getById(conversationId);
    if (!conversation) throw new Error('Conversation not found');

    await conversationService.addMessage(conversationId, { role: 'user', content: userMessage });

    const history = await conversationService.getMessages(conversationId);
    const collectedFields = this.extractCollectedFields(history);
    const existingWorkflow = conversation.workflowId
      ? (await workflowService.getById(conversation.workflowId))?.definition as WorkflowDefinition | undefined
      : undefined;

    const response = await this.callAI(userMessage, collectedFields, existingWorkflow);

    if (response.type === 'workflow' && response.workflow) {
      const wf = response.workflow;
      const saved = await workflowService.create({
        userId,
        name: wf.metadata?.name ?? 'Untitled',
        description: wf.metadata?.description ?? '',
        definition: wf as unknown as Record<string, unknown>,
      });

      const prisma = getPrisma();
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { workflowId: saved.id },
      });

      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: response.explanation ?? 'Workflow generated.',
        metadata: { workflowId: saved.id },
      });

      const n8n = await generateN8nWorkflow(wf);
      return { type: 'workflow', workflow: wf, explanation: response.explanation, n8nWorkflow: n8n };
    }

    if (response.type === 'clarification') {
      await conversationService.addMessage(conversationId, {
        role: 'assistant',
        content: 'Let me ask some questions to better understand your needs.',
        metadata: { questions: response.questions },
      });
    }

    return response;
  },

  async callAI(
    userMessage: string,
    collectedFields: Record<string, string>,
    existingWorkflow?: WorkflowDefinition,
  ): Promise<AIResponse> {
    try {
      let userContent = userMessage;
      if (Object.keys(collectedFields).length > 0) {
        userContent += `\n\nAlready collected: ${JSON.stringify(collectedFields)}`;
      }
      if (existingWorkflow) {
        userContent += `\n\nExisting workflow: ${JSON.stringify(existingWorkflow)}`;
      }

      const content = await chatCompletion([
        { role: 'system', content: AI_PROMPTS.GENERATE_WORKFLOW },
        { role: 'user', content: userContent },
      ]);

      const parsed = JSON.parse(content);

      if (parsed.type === 'clarification' && parsed.questions) {
        const validated = AIClarificationResponseSchema.safeParse(parsed);
        return {
          type: 'clarification',
          questions: validated.success ? validated.data.questions : parsed.questions,
        };
      }

      if (parsed.type === 'workflow' && parsed.workflow) {
        return {
          type: 'workflow',
          workflow: parsed.workflow as WorkflowDefinition,
          explanation: parsed.explanation as string,
        };
      }

      return this.fallbackClarification(userMessage);
    } catch {
      return this.fallbackClarification(userMessage);
    }
  },

  async fallbackClarification(userMessage: string): Promise<AIResponse> {
    try {
      const content = await chatCompletion([
        { role: 'system', content: AI_PROMPTS.GET_CLARIFICATION },
        { role: 'user', content: userMessage },
      ], { max_tokens: 2000 });

      const parsed = JSON.parse(content);
      return {
        type: 'clarification',
        questions: parsed.questions ?? [
          { id: 'q1', question: 'What should trigger this workflow?', required: true },
          { id: 'q2', question: 'What action should the workflow perform?', required: true },
        ],
      };
    } catch {
      return { type: 'error', error: 'I could not process your request. Please try again with more details.' };
    }
  },

  extractCollectedFields(
    messages: Array<{ role: string; content: string; metadata?: unknown }>,
  ): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const msg of messages) {
      const meta = msg.metadata as Record<string, unknown> | null;
      if (meta?.answers && typeof meta.answers === 'object') {
        Object.assign(fields, meta.answers as Record<string, string>);
      }
    }
    return fields;
  },
};
