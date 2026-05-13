import apiClient from './client';
import type { WorkflowDefinition } from '@qona/shared';

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  workflows: T[];
  total: number;
}

export async function fetchWorkflows(): Promise<PaginatedResponse<WorkflowListItem>> {
  const { data } = await apiClient.get<PaginatedResponse<WorkflowListItem>>('/workflows');
  return data;
}

export async function fetchWorkflow(id: string): Promise<{ workflow: WorkflowListItem & { definition: WorkflowDefinition } }> {
  const { data } = await apiClient.get(`/workflows/${id}`);
  return data;
}

export async function saveWorkflow(payload: {
  name: string;
  description?: string;
  definition: WorkflowDefinition;
}) {
  const { data } = await apiClient.post('/workflows', payload);
  return data;
}

export async function updateWorkflow(
  id: string,
  payload: Partial<{ name: string; description: string; definition: WorkflowDefinition; status: string }>,
) {
  const { data } = await apiClient.put(`/workflows/${id}`, payload);
  return data;
}

export async function deleteWorkflow(id: string) {
  const { data } = await apiClient.delete(`/workflows/${id}`);
  return data;
}
