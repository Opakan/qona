import { describe, it, expect } from 'vitest';
import { buildInitialPlan, generateNextQuestion } from '../src/services/requirement-collector.js';
import { compileInternalGraph } from '../src/services/n8n-compiler.js';
import type { IntentExtractionResult, InternalGraph } from '@qona/shared';

describe('Intent Email Trigger Requirement & Compilation', () => {
  it('triggers provider clarification when email_received trigger has no provider in config', () => {
    const intent: IntentExtractionResult = {
      trigger: {
        type: 'email_received',
        label: 'When I receive an email',
        description: 'Starts workflow on email',
        config: {},
      },
      actions: [],
      integrations: [],
      confidence: 0.9,
      missingDetails: [],
    };

    const plan = buildInitialPlan(intent, 'When I receive an email');
    const triggerProviderReq = plan.requirements.find((r) => r.field === 'trigger_provider')!;
    
    expect(triggerProviderReq).toBeDefined();
    expect(triggerProviderReq.collected).toBe(false);

    const question = generateNextQuestion(plan, triggerProviderReq);
    expect(question.question).toBe('Which email provider do you use?');
    expect(question.options).toEqual(['Gmail', 'Microsoft Outlook', 'IMAP', 'POP3', 'Exchange', 'Yahoo']);
  });

  it('compiles email_received trigger with Gmail provider to gmailTrigger', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Gmail Trigger Test' },
      nodes: [
        {
          id: 'n1',
          type: 'email_received',
          label: 'Email Received',
          position: { x: 100, y: 100 },
          config: {
            provider: 'gmail',
          },
        },
        {
          id: 'n2',
          type: 'transform_data',
          label: 'Transform',
          position: { x: 300, y: 100 },
          config: {},
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const triggerNode = result.workflow!.nodes.find((n) => n.id === 'n1')!;
    expect(triggerNode.type).toBe('n8n-nodes-base.gmailTrigger');
  });

  it('compiles email_received trigger with Outlook provider to microsoftOutlookTrigger', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Outlook Trigger Test' },
      nodes: [
        {
          id: 'n1',
          type: 'email_received',
          label: 'Email Received',
          position: { x: 100, y: 100 },
          config: {
            provider: 'outlook',
          },
        },
        {
          id: 'n2',
          type: 'transform_data',
          label: 'Transform',
          position: { x: 300, y: 100 },
          config: {},
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const triggerNode = result.workflow!.nodes.find((n) => n.id === 'n1')!;
    expect(triggerNode.type).toBe('n8n-nodes-base.microsoftOutlookTrigger');
  });

  it('compiles email_received trigger with IMAP provider to emailReadImap', () => {
    const graph: InternalGraph = {
      metadata: { name: 'IMAP Trigger Test' },
      nodes: [
        {
          id: 'n1',
          type: 'email_received',
          label: 'Email Received',
          position: { x: 100, y: 100 },
          config: {
            provider: 'imap',
          },
        },
        {
          id: 'n2',
          type: 'transform_data',
          label: 'Transform',
          position: { x: 300, y: 100 },
          config: {},
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const triggerNode = result.workflow!.nodes.find((n) => n.id === 'n1')!;
    expect(triggerNode.type).toBe('n8n-nodes-base.emailReadImap');
  });

  it('compiles email_received trigger with Exchange provider to microsoftExchangeTrigger', () => {
    const graph: InternalGraph = {
      metadata: { name: 'Exchange Trigger Test' },
      nodes: [
        {
          id: 'n1',
          type: 'email_received',
          label: 'Email Received',
          position: { x: 100, y: 100 },
          config: {
            provider: 'exchange',
          },
        },
        {
          id: 'n2',
          type: 'transform_data',
          label: 'Transform',
          position: { x: 300, y: 100 },
          config: {},
        },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
    };

    const result = compileInternalGraph(graph);
    expect(result.success).toBe(true);

    const triggerNode = result.workflow!.nodes.find((n) => n.id === 'n1')!;
    expect(triggerNode.type).toBe('n8n-nodes-base.microsoftExchangeTrigger');
  });
});
