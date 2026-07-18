import type { N8nParamSchema } from './n8n-node-registry.js';

// ═══════════════════════════════════════════════════════════
// n8n expression syntax checker
// ═══════════════════════════════════════════════════════════

/**
 * Returns true when the value is an n8n expression string.
 * Expressions are {{ ... }} — their types are not known at compile time
 * so they bypass type checking.
 */
function isExpression(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.includes('{{') && trimmed.includes('}}');
}

/**
 * Validates that an expression is syntactically plausible (balanced braces).
 */
function validateExpressionSyntax(value: string): boolean {
  let depth = 0;
  for (let i = 0; i < value.length - 1; i++) {
    if (value[i] === '{' && value[i + 1] === '{') { depth++; i++; }
    if (value[i] === '}' && value[i + 1] === '}') { depth--; i++; }
    if (depth < 0) return false;
  }
  return depth === 0;
}

// ═══════════════════════════════════════════════════════════
// Validation error type
// ═══════════════════════════════════════════════════════════

export interface ParamValidationError {
  nodeId: string;
  nodeLabel: string;
  n8nType: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// ═══════════════════════════════════════════════════════════
// Core validator
// ═══════════════════════════════════════════════════════════

export function validateNodeParameters(
  nodeId: string,
  nodeLabel: string,
  n8nType: string,
  parameters: Record<string, unknown>,
  schema: N8nParamSchema[],
): ParamValidationError[] {
  const errors: ParamValidationError[] = [];
  const schemaMap = new Map<string, N8nParamSchema>(schema.map((s) => [s.field, s]));
  const schemaFields = new Set<string>(schemaMap.keys());

  // 1. Check required fields
  for (const s of schema) {
    if (!s.required) continue;
    const val = parameters[s.field];
    const missing =
      val === undefined ||
      val === null ||
      (typeof val === 'string' && val.trim().length === 0);
    if (missing) {
      errors.push({
        nodeId,
        nodeLabel,
        n8nType,
        field: s.field,
        message: `Missing required parameter "${s.field}" on node "${nodeLabel}" (${n8nType}).`,
        severity: 'error',
      });
    }
  }

  // 2. Type-check and allowedValues-check all present params
  for (const [key, val] of Object.entries(parameters)) {
    if (val === undefined || val === null) continue;

    // Skip n8n system fields that may appear on any node
    if (['credentials', 'disabled'].includes(key)) continue;

    const fieldSchema = schemaMap.get(key);

    if (!fieldSchema) {
      // Unknown param — warn but do NOT hard-error (n8n nodes can have dynamic params)
      errors.push({
        nodeId,
        nodeLabel,
        n8nType,
        field: key,
        message: `Unknown parameter "${key}" on node "${nodeLabel}" (${n8nType}). It may be valid for this node version but is not in the Qonace registry.`,
        severity: 'warning',
      });
      continue;
    }

    // Expressions bypass type checking
    if (isExpression(val)) {
      if (!validateExpressionSyntax(String(val))) {
        errors.push({
          nodeId,
          nodeLabel,
          n8nType,
          field: key,
          message: `Parameter "${key}" on node "${nodeLabel}" contains a malformed n8n expression (unbalanced braces).`,
          severity: 'error',
        });
      }
      continue;
    }

    // Type checks
    switch (fieldSchema.type) {
      case 'string':
        if (typeof val !== 'string') {
          errors.push({
            nodeId,
            nodeLabel,
            n8nType,
            field: key,
            message: `Parameter "${key}" on node "${nodeLabel}" must be a string, got ${typeof val}.`,
            severity: 'error',
          });
        }
        break;

      case 'number':
        if (typeof val !== 'number' && isNaN(Number(val))) {
          errors.push({
            nodeId,
            nodeLabel,
            n8nType,
            field: key,
            message: `Parameter "${key}" on node "${nodeLabel}" must be a number, got "${val}".`,
            severity: 'error',
          });
        }
        break;

      case 'boolean':
        if (typeof val !== 'boolean') {
          errors.push({
            nodeId,
            nodeLabel,
            n8nType,
            field: key,
            message: `Parameter "${key}" on node "${nodeLabel}" must be a boolean, got ${typeof val}.`,
            severity: 'error',
          });
        }
        break;

      case 'options':
        if (fieldSchema.allowedValues && typeof val === 'string' && !fieldSchema.allowedValues.includes(val)) {
          errors.push({
            nodeId,
            nodeLabel,
            n8nType,
            field: key,
            message: `Parameter "${key}" on node "${nodeLabel}" has invalid value "${val}". Allowed: ${fieldSchema.allowedValues.join(', ')}.`,
            severity: 'error',
          });
        }
        break;

      case 'object':
        if (typeof val !== 'object' || Array.isArray(val)) {
          errors.push({
            nodeId,
            nodeLabel,
            n8nType,
            field: key,
            message: `Parameter "${key}" on node "${nodeLabel}" must be an object, got ${Array.isArray(val) ? 'array' : typeof val}.`,
            severity: 'error',
          });
        }
        break;

      case 'array':
        if (!Array.isArray(val)) {
          errors.push({
            nodeId,
            nodeLabel,
            n8nType,
            field: key,
            message: `Parameter "${key}" on node "${nodeLabel}" must be an array, got ${typeof val}.`,
            severity: 'error',
          });
        }
        break;
    }
  }

  return errors;
}

/** Convert ParamValidationErrors to export validator format */
export function toExportErrors(
  errs: ParamValidationError[],
): Array<{ nodeId?: string; field?: string; message: string; severity: 'error' | 'warning' }> {
  return errs.map((e) => ({
    nodeId: e.nodeId,
    field: e.field,
    message: e.message,
    severity: e.severity,
  }));
}
