import { mockDataEngine } from './mock-engine.js';

export function generateMockTriggerOutput(nodeType: string, params: Record<string, unknown> = {}): Record<string, unknown> {
  return mockDataEngine.generateOutput(nodeType, params, {});
}

export function generateMockNodeOutput(
  nodeType: string,
  params: Record<string, unknown>,
  inputData: Record<string, unknown>
): Record<string, unknown> {
  return mockDataEngine.generateOutput(nodeType, params, inputData);
}
