import type { InternalGraph, GraphNode } from '@qona/shared';
import type { ExecutionTrace, NodeExecutionStep } from '@qona/shared';
import { generateMockTriggerOutput, generateMockNodeOutput } from './mock-data-generators.js';
import { lookupRegistry } from '../n8n-node-registry.js';
import { generateExecutionReport } from './report-generator.js';

export class ExecutionSimulator {
  public simulateGraph(graph: InternalGraph, customTriggerPayload?: Record<string, unknown>): ExecutionTrace {
    const startTime = new Date();
    const steps: NodeExecutionStep[] = [];
    const summary: string[] = [];
    const nodeOutputs = new Map<string, Record<string, unknown>>();

    if (!graph.nodes || graph.nodes.length === 0) {
      const endTime = new Date();
      return {
        id: `sim_trace_${Date.now()}`,
        graphId: graph.id,
        graphName: graph.name || 'Untitled Graph',
        status: 'failed',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalDurationMs: 0,
        steps: [],
        simulatedTriggerPayload: {},
        summary: ['Error: Internal graph has no nodes to simulate.'],
      };
    }

    const orderedNodes = this.topologicalSort(graph.nodes, graph.edges || []);
    let simulatedTriggerPayload: Record<string, unknown> = {};

    let totalMs = 0;
    for (let i = 0; i < orderedNodes.length; i++) {
      const node = orderedNodes[i];
      const stepStartTime = Date.now();

      const incomingEdges = (graph.edges || []).filter((e) => e.target === node.id);
      let stepInputData: Record<string, unknown> = {};

      if (incomingEdges.length === 0 && i === 0) {
        const defaultTrigger = generateMockTriggerOutput(node.type, node.params || {});
        stepInputData = customTriggerPayload ? { ...defaultTrigger, ...customTriggerPayload } : defaultTrigger;
        simulatedTriggerPayload = stepInputData;
      } else {
        for (const edge of incomingEdges) {
          const upstreamOutput = nodeOutputs.get(edge.source);
          if (upstreamOutput) {
            stepInputData = { ...stepInputData, ...upstreamOutput };
          }
        }
      }

      const expressions: Record<string, string> = {};
      for (const [k, v] of Object.entries(node.params || {})) {
        if (typeof v === 'string' && v.includes('{{')) {
          expressions[k] = v;
        }
      }

      const resolvedParams = this.resolveParameters(node.params || {}, stepInputData);
      const { warnings, credentialRequirements, validationStatus } = this.inspectNodeRequirements(node);

      let stepOutputData: Record<string, unknown> = {};
      let stepStatus: NodeExecutionStep['status'] = 'success';
      const logs: string[] = [];

      try {
        if (i === 0 && incomingEdges.length === 0) {
          stepOutputData = stepInputData;
          logs.push(`[Trigger] Fired ${node.type} with simulated incoming payload.`);
        } else {
          stepOutputData = generateMockNodeOutput(node.type, resolvedParams, stepInputData);
          logs.push(`[Action] Executed ${node.label} (${node.type}) cleanly.`);
        }
      } catch (err: any) {
        stepStatus = 'failed';
        logs.push(`[Error] Simulation failed: ${err.message}`);
      }

      const executionTimeMs = Math.floor(Math.random() * 40 + 10);
      totalMs += executionTimeMs;

      nodeOutputs.set(node.id, stepOutputData);

      const registryEntry = lookupRegistry(node.type, node.params);
      const plainEnglishExplanation = (registryEntry as any)?.plainEnglishExplanation || this.getFallbackExplanation(node.type);

      steps.push({
        stepIndex: i + 1,
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.label || node.id,
        status: stepStatus,
        inputData: stepInputData,
        resolvedParameters: resolvedParams,
        expressions,
        outputData: stepOutputData,
        warnings,
        credentialRequirements,
        plainEnglishExplanation,
        validationStatus,
        executionTimeMs,
        logs,
      });

      summary.push(`Step ${i + 1}: ${node.label} (${node.category}) -> ${stepStatus.toUpperCase()}`);
    }

    const endTime = new Date();

    const partialTrace: ExecutionTrace = {
      id: `sim_trace_${Date.now()}`,
      graphId: graph.id,
      graphName: graph.name || 'Untitled Graph',
      status: steps.some((s) => s.status === 'failed') ? 'partial' : 'success',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalDurationMs: totalMs,
      steps,
      simulatedTriggerPayload,
      summary,
    };

    const report = generateExecutionReport(graph, partialTrace);
    return { ...partialTrace, report };
  }

  private inspectNodeRequirements(node: GraphNode): {
    warnings: string[];
    credentialRequirements: string[];
    validationStatus: 'VALID' | 'WARNING' | 'ERROR';
  } {
    const warnings: string[] = [];
    const credentialRequirements: string[] = [];
    const normType = node.type.toLowerCase().replace(/_/g, '-');

    if (normType.includes('openai')) {
      credentialRequirements.push('OpenAI API Key (openAiApi)');
    } else if (normType.includes('telegram')) {
      credentialRequirements.push('Telegram Bot Token (telegramApi)');
    } else if (normType.includes('slack')) {
      credentialRequirements.push('Slack OAuth2 API (slackOAuth2Api)');
    } else if (normType.includes('gmail')) {
      credentialRequirements.push('Gmail OAuth2 API (gmailOAuth2)');
    } else if (normType.includes('google') && normType.includes('sheet')) {
      credentialRequirements.push('Google Sheets OAuth2 (googleSheetsOAuth2Api)');
    } else if (normType.includes('postgres')) {
      credentialRequirements.push('Postgres Connection Credentials (postgres)');
    } else if (normType.includes('supabase')) {
      credentialRequirements.push('Supabase API Key (supabaseApi)');
    }

    if (credentialRequirements.length > 0) {
      warnings.push(`Credential link needed upon import: ${credentialRequirements.join(', ')}`);
    }

    for (const [k, v] of Object.entries(node.params || {})) {
      if (typeof v === 'string' && (v.includes('USER_CONFIGURED') || v.includes('REPLACE_WITH'))) {
        warnings.push(`Parameter '${k}' requires user configuration.`);
      }
    }

    const validationStatus = warnings.length > 0 ? 'WARNING' : 'VALID';
    return { warnings, credentialRequirements, validationStatus };
  }

  private getFallbackExplanation(nodeType: string): string {
    const norm = nodeType.toLowerCase().replace(/_/g, '-');
    if (norm.includes('webhook')) return 'This node waits for an incoming HTTP request.';
    if (norm.includes('openai')) return 'This node sends the incoming text to GPT for summarization.';
    if (norm.includes('telegram')) return 'This node posts the generated summary into your selected Telegram chat.';
    if (norm.includes('slack')) return 'This node posts an automated alert to your selected Slack channel.';
    if (norm.includes('gmail') || norm.includes('email')) return 'This node sends an automated email notification.';
    if (norm.includes('google') && norm.includes('sheet')) return 'This node appends a new row of data to your Google Spreadsheet.';
    if (norm.includes('cron') || norm.includes('schedule')) return 'This node triggers the workflow automatically on a scheduled timer.';
    if (norm.includes('postgres')) return 'This node executes a query against your PostgreSQL database.';
    if (norm.includes('supabase')) return 'This node queries or writes records in your Supabase database table.';
    return `This node executes the ${nodeType} workflow action.`;
  }

  private resolveParameters(
    params: Record<string, unknown>,
    inputData: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(params)) {
      if (typeof val === 'string' && val.includes('{{')) {
        if (val.includes('$json.body.text') && (inputData.body as any)?.text) {
          resolved[key] = (inputData.body as any).text;
        } else if (val.includes('$json.body') && inputData.body) {
          resolved[key] = inputData.body;
        } else if (val.includes('$json.text') && inputData.text) {
          resolved[key] = inputData.text;
        } else {
          resolved[key] = val;
        }
      } else {
        resolved[key] = val;
      }
    }
    return resolved;
  }

  private topologicalSort(nodes: GraphNode[], edges: { source: string; target: string }[]): GraphNode[] {
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      graph.set(node.id, []);
    }

    for (const edge of edges) {
      if (graph.has(edge.source) && inDegree.has(edge.target)) {
        graph.get(edge.source)!.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const result: GraphNode[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const node = nodeMap.get(currId);
      if (node) result.push(node);

      const neighbors = graph.get(currId) || [];
      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (result.length < nodes.length) {
      const visited = new Set(result.map((n) => n.id));
      for (const node of nodes) {
        if (!visited.has(node.id)) result.push(node);
      }
    }

    return result;
  }
}

export const executionSimulator = new ExecutionSimulator();
