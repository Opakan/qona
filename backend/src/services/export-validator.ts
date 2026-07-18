import type { InternalGraph, GraphNode, GraphEdge } from '@qona/shared';
import { lookupRegistry } from './n8n-node-registry.js';
import { validateNodeParameters, toExportErrors } from './n8n-param-validator.js';

// ═══════════════════════════════════════════════════════════
// Export validation result types
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// Main export validator
// ═══════════════════════════════════════════════════════════

export function validateExport(graph: InternalGraph): ExportValidationResult {
  const errors: ExportValidationError[] = [];
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];

  // ─── 1. Validate Node IDs (unique, non-empty) ───
  const nodeIds = new Set<string>();
  for (const node of nodes) {
    if (!node.id || node.id.trim() === '') {
      errors.push({ message: `Node has an invalid, empty, or missing ID.`, severity: 'error' });
    } else if (nodeIds.has(node.id)) {
      errors.push({ nodeId: node.id, message: `Duplicate Node ID detected: "${node.id}".`, severity: 'error' });
    } else {
      nodeIds.add(node.id);
    }
  }

  // ─── 2. Node label uniqueness check (n8n uses names as connection keys) ───
  const nodeLabels = new Map<string, string>(); // label → id
  for (const node of nodes) {
    if (!node.label || node.label.trim() === '') {
      errors.push({ nodeId: node.id, message: `Node "${node.id}" has no label/name.`, severity: 'error' });
      continue;
    }
    if (nodeLabels.has(node.label)) {
      // Warn only — compiler auto-deduplicates
      errors.push({
        nodeId: node.id,
        message: `Duplicate node label "${node.label}" (id: ${node.id} and ${nodeLabels.get(node.label)}). Labels will be auto-suffixed on export.`,
        severity: 'warning',
      });
    } else {
      nodeLabels.set(node.label, node.id);
    }
  }

  // Build lookup maps for later checks
  const nodeIdMap = new Map<string, GraphNode>();
  const nodeLabelMap = new Map<string, string>(); // name → id
  for (const node of nodes) {
    nodeIdMap.set(node.id, node);
    if (node.label) nodeLabelMap.set(node.label.trim(), node.id);
  }

  // ─── 3. Validate each node against its registry entry ───
  for (const node of nodes) {
    const registryEntry = lookupRegistry(node.type, node.config);

    if (!registryEntry) {
      errors.push({
        nodeId: node.id,
        field: 'type',
        message: `Node "${node.label || node.id}" uses an unregistered type: "${node.type}". It will fall back to noOp on export.`,
        severity: 'warning', // Warning not error — noOp fallback is safe
      });
      continue;
    }

    const n8nType = registryEntry.n8nType;
    const config = node.config ?? {};

    // ── 3a. Run deep parameter validation against paramSchema ──
    if (registryEntry.paramSchema && registryEntry.paramSchema.length > 0) {
      // Build the mapped parameters (same logic as compiler)
      let mappedParams: Record<string, unknown> = {};
      if (registryEntry.mapConfig) {
        try {
          mappedParams = registryEntry.mapConfig(config);
        } catch {
          mappedParams = { ...config };
        }
      } else {
        mappedParams = { ...config };
      }
      const mergedParams = { ...registryEntry.defaults, ...mappedParams };

      const paramErrors = validateNodeParameters(
        node.id,
        node.label || node.id,
        n8nType,
        mergedParams,
        registryEntry.paramSchema,
      );
      errors.push(...toExportErrors(paramErrors));

      // Also scan raw config keys for unknown properties that mapConfig may have silently dropped
      const knownSchemaFields = new Set<string>(registryEntry.paramSchema.map((s) => s.field));
      // Add common mapped aliases (e.g. 'method' → 'httpMethod') accepted as input
      const mapAliases = new Set<string>([
        'method', 'to', 'body', 'code', 'spreadsheetId', 'tableName', 'channelId', 'text',
        // internal/qona fields that are always allowed
        'credentials', 'provider', 'resource', 'operation', 'dependencies',
        'binaryRequirements', 'triggerType', 'email_provider',
        'cronExpression', 'durationMs', 'expression',
      ]);
      for (const key of Object.keys(config)) {
        if (!knownSchemaFields.has(key) && !mapAliases.has(key)) {
          errors.push({
            nodeId: node.id,
            field: key,
            message: `Unknown parameter "${key}" on node "${node.label || node.id}" (${n8nType}). It may be valid for this node version but is not in the Qonace registry.`,
            severity: 'warning',
          });
        }
      }
    } else {
      // Legacy check: required params must be present
      const allParams = { ...registryEntry.defaults, ...(config) };
      for (const reqParam of registryEntry.requiredParams) {
        const value = allParams[reqParam];
        if (value === undefined || value === null || String(value).trim().length === 0) {
          errors.push({
            nodeId: node.id,
            field: reqParam,
            message: `Node "${node.label}" is missing required parameter: "${reqParam}".`,
            severity: 'error',
          });
        }
      }
    }

    // ── 3b. Credential validation: warn when credentials are missing ──
    if (registryEntry.credentials && registryEntry.credentials.length > 0) {
      for (const cred of registryEntry.credentials) {
        if (cred.required && !config.credentials) {
          errors.push({
            nodeId: node.id,
            message: `Node "${node.label}" requires credential "${cred.type}" but none is configured. A placeholder will be emitted on export — replace it after import.`,
            severity: 'warning',
          });
        }
      }
    }

    // ── 3c. Validate n8n expression references point to existing nodes ──
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

  // ─── 4. Validate connections (edges) ───
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

    // If-node branch labels must be present
    const sourceNode = nodeIdMap.get(edge.source);
    if (sourceNode?.type === 'n8n-nodes-base.if' || lookupRegistry(sourceNode?.type ?? '')?.n8nType === 'n8n-nodes-base.if') {
      const label = (edge.label ?? '').toLowerCase().trim();
      const validLabels = ['true', 'false', 'yes', 'no'];
      if (!validLabels.includes(label)) {
        errors.push({
          nodeId: edge.source,
          message: `Edge from If node "${sourceNode?.label}" must be labelled 'true'/'yes' or 'false'/'no'.`,
          severity: 'error',
        });
      }
    }
  }

  // ─── 5. Orphan node detection ───
  if (nodes.length > 1) {
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
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}
