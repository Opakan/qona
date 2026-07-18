import type { InternalGraph, GraphNode, GraphEdge } from '@qona/shared';
import { lookupRegistry } from './n8n-node-registry.js';
import { nodeRegistry } from './node-registry.js';
import { determineRequirements } from './requirement-collector.js';

export interface ExportValidationError {
  nodeId?: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ExportValidationResult {
  valid: boolean;
  errors: ExportValidationError[];
}

const ALLOWED_RESOURCES: Record<string, string[]> = {
  'n8n-nodes-base.googleSheets': ['spreadsheet'],
  'n8n-nodes-base.gmail': ['message'],
  'n8n-nodes-base.slack': ['message'],
  'n8n-nodes-base.supabase': ['row'],
  'n8n-nodes-base.telegram': ['message'],
  'n8n-nodes-base.webhook': ['webhook'],
  'n8n-nodes-base.cron': ['timer'],
  'n8n-nodes-base.scheduleTrigger': ['timer'],
  'n8n-nodes-base.manualTrigger': ['user'],
  'n8n-nodes-base.wait': ['timer'],
  'n8n-nodes-base.if': ['conditions'],
  'n8n-nodes-base.noOp': ['none'],
  'n8n-nodes-base.code': ['none'],
  'n8n-nodes-base.httpRequest': ['none'],
};

const ALLOWED_OPERATIONS: Record<string, string[]> = {
  'n8n-nodes-base.googleSheets': ['appendRow', 'readRows', 'updateRow', 'deleteRow', 'getRows', 'create'],
  'n8n-nodes-base.gmail': ['send', 'reply', 'delete', 'get', 'list'],
  'n8n-nodes-base.slack': ['postMessage'],
  'n8n-nodes-base.supabase': ['rowGet', 'rowCreate', 'rowUpdate', 'rowDelete'],
  'n8n-nodes-base.telegram': ['sendMessage'],
  'n8n-nodes-base.webhook': ['listen'],
  'n8n-nodes-base.cron': ['tick'],
  'n8n-nodes-base.scheduleTrigger': ['tick'],
  'n8n-nodes-base.manualTrigger': ['tick'],
  'n8n-nodes-base.wait': ['none'],
  'n8n-nodes-base.if': ['none'],
  'n8n-nodes-base.noOp': ['none'],
  'n8n-nodes-base.code': ['none'],
  'n8n-nodes-base.httpRequest': ['none'],
};

function getJsonNodeType(type: string): string {
  const map: Record<string, string> = {
    send_email: 'gmail',
    create_record: 'google_sheets',
    update_record: 'google_sheets',
    send_notification: 'slack',
  };
  return map[type] ?? type;
}

export function validateExport(graph: InternalGraph): ExportValidationResult {
  const errors: ExportValidationError[] = [];
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  // 1. Validate Node IDs (unique, non-empty)
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (!node.id || node.id.trim() === '') {
      errors.push({
        message: `Node has an invalid, empty, or missing ID.`,
        severity: 'error',
      });
    } else if (nodeIds.has(node.id)) {
      errors.push({
        nodeId: node.id,
        message: `Duplicate Node ID detected: "${node.id}".`,
        severity: 'error',
      });
    } else {
      nodeIds.add(node.id);
    }
  }

  // Map of node labels/names for expression validation
  const nodeLabelMap = new Map<string, string>(); // name -> id
  const nodeIdMap = new Map<string, GraphNode>(); // id -> Node
  for (const node of nodes) {
    nodeIdMap.set(node.id, node);
    if (node.label) {
      nodeLabelMap.set(node.label.trim(), node.id);
    }
  }

  // 2. Validate Nodes (type, resource, operation, required params, unsupported properties)
  for (const node of nodes) {
    const registryEntry = lookupRegistry(node.type);
    if (!registryEntry) {
      errors.push({
        nodeId: node.id,
        field: 'type',
        message: `Node "${node.label || node.id}" uses an unregistered or invalid type: "${node.type}".`,
        severity: 'error',
      });
      continue;
    }

    const n8nType = registryEntry.n8nType;
    const config = node.config ?? {};

    // Validate resource
    const det = determineRequirements(node.type, config);
    const resolvedResource = det.resource?.value;
    const allowedResources = ALLOWED_RESOURCES[n8nType];
    if (allowedResources && resolvedResource && !allowedResources.includes(resolvedResource)) {
      errors.push({
        nodeId: node.id,
        field: 'resource',
        message: `Node "${node.label}" uses unsupported resource "${resolvedResource}". Allowed: ${allowedResources.join(', ')}`,
        severity: 'error',
      });
    }

    // Validate operation
    const resolvedOperation = det.operation?.value;
    const allowedOperations = ALLOWED_OPERATIONS[n8nType];
    if (allowedOperations && resolvedOperation && !allowedOperations.includes(resolvedOperation)) {
      errors.push({
        nodeId: node.id,
        field: 'operation',
        message: `Node "${node.label}" performs unsupported operation "${resolvedOperation}". Allowed: ${allowedOperations.join(', ')}`,
        severity: 'error',
      });
    }

    // Validate required parameters
    let params: Record<string, unknown> = {};
    if (registryEntry.mapConfig) {
      try {
        params = registryEntry.mapConfig(config);
      } catch (err: any) {
        errors.push({
          nodeId: node.id,
          message: `Mapping node configuration failed: ${err.message}`,
          severity: 'error',
        });
      }
    } else {
      params = { ...config };
    }

    const compiledParams = {
      ...(registryEntry.defaults ?? {}),
      ...params,
    };

    for (const reqParam of registryEntry.requiredParams) {
      const value = compiledParams[reqParam];
      if (value === undefined || value === null || String(value).trim().length === 0) {
        errors.push({
          nodeId: node.id,
          field: reqParam,
          message: `Node "${node.label}" is missing required parameter: "${reqParam}".`,
          severity: 'error',
        });
      }
    }

    // Validate unsupported properties in user config
    const allowedUserParams = new Set<string>([
      'credentials', 'provider', 'resource', 'operation', 'dependencies', 'binaryRequirements', 'triggerType',
      ...registryEntry.requiredParams,
      ...registryEntry.optionalParams,
    ]);

    // Also allow original JSON-based fields
    const nodeDef = nodeRegistry.getNode(getJsonNodeType(node.type));
    if (nodeDef) {
      for (const f of [...nodeDef.requiredFields, ...nodeDef.optionalFields]) {
        allowedUserParams.add(f.field);
      }
    }

    for (const key of Object.keys(config)) {
      if (!allowedUserParams.has(key)) {
        errors.push({
          nodeId: node.id,
          field: key,
          message: `Node "${node.label}" contains unsupported property: "${key}".`,
          severity: 'error',
        });
      }
    }

    // 3. Validate expressions referencing existing node outputs
    // Expressions reference format: {{ $node["Node Name"]... }} or {{ $node.NodeName... }} or {{ $('Node Name')... }}
    const strConfig = JSON.stringify(config).replace(/\\"/g, '"').replace(/\\'/g, "'");
    const expressionRegexes = [
      /\$node\["([^"]+)"\]/g,
      /\$node\['([^']+)'\]/g,
      /\$node\.([a-zA-Z0-9_]+)/g,
      /\$\('([^']+)'\)/g,
      /\$\("([^"]+)"\)/g,
    ];

    for (const regex of expressionRegexes) {
      let match;
      while ((match = regex.exec(strConfig)) !== null) {
        const referencedName = match[1].trim();
        // Skip default/built-ins if any
        if (referencedName === 'json' || referencedName === 'parameter') continue;

        const exists = nodeLabelMap.has(referencedName) || nodeIdMap.has(referencedName);
        if (!exists) {
          errors.push({
            nodeId: node.id,
            message: `Node "${node.label}" contains an expression referencing a non-existent node: "${referencedName}".`,
            severity: 'error',
          });
        }
      }
    }
  }

  // 4. Validate Connections (edges)
  const connectedNodes = new Set<string>();
  for (const edge of edges) {
    if (!nodeIdMap.has(edge.source)) {
      errors.push({
        message: `Edge "${edge.id}" points from non-existent source node: "${edge.source}".`,
        severity: 'error',
      });
    } else {
      connectedNodes.add(edge.source);
    }

    if (!nodeIdMap.has(edge.target)) {
      errors.push({
        message: `Edge "${edge.id}" points to non-existent target node: "${edge.target}".`,
        severity: 'error',
      });
    } else {
      connectedNodes.add(edge.target);
    }

    // Port connection validation for conditional If node
    const sourceNode = nodeIdMap.get(edge.source);
    if (sourceNode?.type === 'n8n-nodes-base.if' || lookupRegistry(sourceNode?.type ?? '')?.n8nType === 'n8n-nodes-base.if') {
      const label = (edge.label ?? '').toLowerCase().trim();
      const validLabels = ['true', 'false', 'yes', 'no'];
      if (!validLabels.includes(label)) {
        errors.push({
          nodeId: edge.source,
          message: `Edge from If node "${sourceNode.label}" must have a label ('true'/'yes' or 'false'/'no') to route branching correctly.`,
          severity: 'error',
        });
      }
    }
  }

  // 5. Validate Orphan Nodes
  if (nodes.length > 0) {
    for (const node of nodes) {
      if (!connectedNodes.has(node.id)) {
        errors.push({
          nodeId: node.id,
          message: `Node "${node.label}" is orphaned (has no incoming or outgoing connections).`,
          severity: 'error',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
