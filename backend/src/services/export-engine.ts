import type { WorkflowDefinition } from '@qona/shared';

export interface SetupInstructions {
  platform: string;
  steps: string[];
  prerequisites: string[];
  notes: string[];
}

export interface ExportResult {
  platform: string;
  filename: string;
  content: unknown;
  instructions: SetupInstructions;
  warnings: string[];
}

const n8nInstructions: SetupInstructions = {
  platform: 'n8n',
  prerequisites: [
    'n8n instance (self-hosted or n8n.cloud)',
    'n8n version 1.0+ recommended',
  ],
  steps: [
    'Download the JSON file below',
    'Open your n8n dashboard',
    'Click "Workflows" → "Import from File"',
    'Select the downloaded JSON file',
    'Review the imported workflow nodes',
    'Configure any required credentials (webhooks, APIs, etc.)',
    'Activate the workflow using the toggle switch',
  ],
  notes: [
    'All node positions are pre-configured for visual clarity',
    'You may need to reconfigure credentials for your environment',
    'Webhook URLs will be generated when you activate the workflow',
  ],
};

const zapierInstructions: SetupInstructions = {
  platform: 'Zapier',
  prerequisites: [
    'Zapier account (Free or paid plan)',
    'Zapier Webhooks integration (for custom steps)',
  ],
  steps: [
    'Download the JSON blueprint below',
    'Log in to your Zapier dashboard',
    'Click "Create Zap" → "Import Zap"',
    'Upload the downloaded JSON file',
    'Review each step and connect your accounts',
    'Test each step to verify the integration works',
    'Turn on your Zap when ready',
  ],
  notes: [
    'Zapier may require re-authentication for each connected app',
    'Some transforms may need adjustment based on your data format',
    'Premium apps require a paid Zapier plan',
  ],
};

const makeInstructions: SetupInstructions = {
  platform: 'Make.com',
  prerequisites: [
    'Make.com account (Free or paid plan)',
    'Make.com scenario editor access',
  ],
  steps: [
    'Download the JSON blueprint below',
    'Log in to your Make.com dashboard',
    'Click "Scenarios" → "Import Blueprint"',
    'Select the downloaded JSON file',
    'Modules will appear in your scenario editor',
    'Configure each module with your API connections',
    'Run a test to verify the scenario works',
    'Schedule or enable the scenario',
  ],
  notes: [
    'Modules may need credential setup before they work',
    'Filters and routers are pre-configured but adjustable',
    'Ensure your Make.com plan supports the modules used',
  ],
};

function getInstructions(platform: string): SetupInstructions {
  switch (platform) {
    case 'n8n': return n8nInstructions;
    case 'zapier': return zapierInstructions;
    case 'make': return makeInstructions;
    default: return { ...n8nInstructions, platform };
  }
}

export function getSetupInstructions(platform: string): SetupInstructions {
  return getInstructions(platform);
}

export function getFilename(workflowName: string, platform: string): string {
  const safeName = workflowName.replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '_');
  return `${safeName}_${platform}.json`;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function validateForExport(
  definition: WorkflowDefinition,
  platform: string,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!definition.nodes || definition.nodes.length === 0) {
    warnings.push({ field: 'nodes', message: 'Workflow has no nodes', severity: 'error' });
  }

  if (!definition.edges || definition.edges.length === 0) {
    warnings.push({ field: 'edges', message: 'Workflow has no connections between nodes', severity: 'warning' });
  }

  const hasTrigger = definition.nodes?.some((n) =>
    ['webhook', 'trigger', 'cron', 'schedule'].includes(n.type?.toLowerCase() ?? ''),
  );
  if (!hasTrigger) {
    warnings.push({ field: 'nodes', message: 'No trigger node found. Workflow may not start automatically', severity: 'warning' });
  }

  if (!definition.metadata?.name) {
    warnings.push({ field: 'name', message: 'Workflow has no name', severity: 'warning' });
  }

  const nodeIds = new Set(definition.nodes?.map((n) => n.id));
  for (const edge of definition.edges ?? []) {
    if (!nodeIds.has(edge.source)) {
      warnings.push({ field: 'edges', message: `Edge references missing source node: ${edge.source}`, severity: 'error' });
    }
    if (!nodeIds.has(edge.target)) {
      warnings.push({ field: 'edges', message: `Edge references missing target node: ${edge.target}`, severity: 'error' });
    }
  }

  if (platform === 'make') {
    const unsupported = definition.nodes?.filter((n) =>
      ['googlesheets', 'emailsend', 'code'].includes(n.type?.toLowerCase() ?? ''),
    );
    if (unsupported?.length) {
      warnings.push({
        field: 'nodes',
        message: `${unsupported.length} node(s) may not have direct Make.com equivalents`,
        severity: 'warning',
      });
    }
  }

  if (platform === 'zapier') {
    const hasCode = definition.nodes?.some((n) =>
      ['code', 'function', 'filter'].includes(n.type?.toLowerCase() ?? ''),
    );
    if (hasCode) {
      warnings.push({
        field: 'nodes',
        message: 'Code/filter nodes may need manual reconfiguration in Zapier',
        severity: 'warning',
      });
    }
  }

  return warnings;
}

export function convertToN8nFormat(definition: WorkflowDefinition) {
  return {
    name: definition.metadata?.name ?? 'Untitled Workflow',
    nodes: (definition.nodes ?? []).map((n, i) => ({
      id: n.id,
      name: (n.data as Record<string, unknown>)?.label as string ?? n.id,
      type: n.type,
      typeVersion: 1,
      position: [n.position.x, n.position.y] as [number, number],
      parameters: (n.data as Record<string, unknown>)?.config as Record<string, unknown> ?? {},
      ...(i === 0 ? {
        webhookId: `qona-${Date.now()}`,
        authentication: 'none',
        options: {},
      } : {}),
    })),
    connections: buildN8nConnections(definition),
    tags: ['qona'],
  };
}

export function convertToZapierFormat(definition: WorkflowDefinition) {
  return {
    title: definition.metadata?.name ?? 'Untitled Zap',
    description: definition.metadata?.description ?? '',
    steps: (definition.nodes ?? []).map((n, i) => ({
      id: n.id,
      name: (n.data as Record<string, unknown>)?.label as string ?? n.id,
      type: i === 0 ? 'trigger' : 'action',
      params: (n.data as Record<string, unknown>)?.config as Record<string, unknown> ?? {},
      connections: definition.edges
        ?.filter((e) => e.source === n.id)
        .map((e) => ({ target: e.target })),
    })),
    version: 1,
    source: 'qona',
  };
}

export function convertToMakeFormat(definition: WorkflowDefinition) {
  return {
    name: definition.metadata?.name ?? 'Untitled Scenario',
    description: definition.metadata?.description ?? '',
    modules: (definition.nodes ?? []).map((n, i) => ({
      id: n.id,
      label: (n.data as Record<string, unknown>)?.label as string ?? n.id,
      type: n.type,
      parameters: (n.data as Record<string, unknown>)?.config as Record<string, unknown> ?? {},
      position: [n.position.x, n.position.y] as [number, number],
      connections: definition.edges
        ?.filter((e) => e.source === n.id)
        .map((e) => ({ id: `edge-${e.source}-${e.target}`, target: e.target })),
    })),
    exportVersion: '1.0',
  };
}

function buildN8nConnections(
  definition: WorkflowDefinition,
): Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> {
  const connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> = {};
  for (const edge of definition.edges ?? []) {
    if (!connections[edge.source]) {
      connections[edge.source] = { main: [[]] };
    }
    connections[edge.source].main[0].push({ node: edge.target, type: 'main', index: 0 });
  }
  return connections;
}

export function buildExport(
  definition: WorkflowDefinition,
  platform: string,
): ExportResult {
  const warnings = validateForExport(definition, platform);
  const errors = warnings.filter((w) => w.severity === 'error');

  let content: unknown;
  switch (platform) {
    case 'zapier':
      content = convertToZapierFormat(definition);
      break;
    case 'make':
      content = convertToMakeFormat(definition);
      break;
    case 'n8n':
      content = definition;
      break;
    default:
      content = convertToN8nFormat(definition);
      break;
  }

  return {
    platform,
    filename: getFilename(definition.metadata?.name ?? (definition as any).name ?? 'workflow', platform),
    content,
    instructions: getInstructions(platform),
    warnings: warnings.map((w) => w.message),
  };
}
