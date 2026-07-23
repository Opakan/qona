import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { NodeDefinitionSchema } from '@qona/shared';
import type { NodeDefinition, NodeField } from '@qona/shared';

// ═══════════════════════════════════════════════════════════
// Resolve knowledge directory path
// ═══════════════════════════════════════════════════════════

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const KNOWLEDGE_DIR = join(__dirname, '..', 'knowledge', 'nodes');

// ═══════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════

let registry: NodeDefinition[] | null = null;

function loadAllNodes(): NodeDefinition[] {
  if (registry) return registry;

  const nodes: NodeDefinition[] = [];
  const dir = KNOWLEDGE_DIR;

  if (!existsSync(dir)) {
    console.warn(`[NodeRegistry] Knowledge directory not found: ${dir}`);
    return nodes;
  }

  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), 'utf-8');
      const parsed = JSON.parse(raw);
      const validated = NodeDefinitionSchema.safeParse(parsed);

      if (validated.success) {
        nodes.push(validated.data);
      } else {
        console.warn(
          `[NodeRegistry] Skipping invalid node file "${file}":`,
          validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        );
      }
    } catch (err) {
      console.warn(`[NodeRegistry] Failed to load node file "${file}":`, (err as Error).message);
    }
  }

  console.log(`[NodeRegistry] Loaded ${nodes.length} node definitions`);
  registry = nodes;
  return nodes;
}

export const nodeRegistry = {
  /** Reload all nodes from disk (useful for hot-reload or testing) */
  reload(): NodeDefinition[] {
    registry = null;
    return loadAllNodes();
  },

  /** Get a single node definition by its nodeType */
  getNode(nodeType: string): NodeDefinition | undefined {
    const norm = nodeType.replace(/_/g, '-');
    return loadAllNodes().find(
      (n) => n.nodeType === nodeType || n.nodeType === norm || n.nodeType.replace(/_/g, '-') === norm
    );
  },

  /** Return all loaded node definitions */
  getAllNodes(): NodeDefinition[] {
    return loadAllNodes();
  },

  /** Return only nodes of a given category */
  getByCategory(category: 'trigger' | 'action'): NodeDefinition[] {
    return loadAllNodes().filter((n) => n.category === category);
  },

  /** Return valid trigger node types */
  getTriggerTypes(): string[] {
    return this.getByCategory('trigger').map((n) => n.nodeType);
  },

  /** Return valid action node types */
  getActionTypes(): string[] {
    return this.getByCategory('action').map((n) => n.nodeType);
  },

  /** Return all valid node types */
  getNodeTypes(): string[] {
    return loadAllNodes().map((n) => n.nodeType);
  },

  /** Search nodes by keyword, name, or description */
  searchNodes(query: string): NodeDefinition[] {
    const lower = query.toLowerCase();
    return loadAllNodes().filter(
      (n) =>
        n.displayName.toLowerCase().includes(lower) ||
        n.description.toLowerCase().includes(lower) ||
        n.nodeType.toLowerCase().includes(lower) ||
        n.keywords.some((k) => k.toLowerCase().includes(lower)),
    );
  },

  /** Check if a node type is registered */
  isRegistered(nodeType: string): boolean {
    return !!this.getNode(nodeType);
  },

  /** Get required fields for a given node type */
  getRequiredFields(nodeType: string): NodeField[] {
    const node = this.getNode(nodeType);
    return node ? node.requiredFields.filter((f) => f.required) : [];
  },

  /** Get all fields (required + optional) for a given node type */
  getAllFields(nodeType: string): NodeField[] {
    const node = this.getNode(nodeType);
    if (!node) return [];
    return [...node.requiredFields, ...node.optionalFields];
  },

  // ═══════════════════════════════════════════════════════════
  // Prompt context builder
  // ═══════════════════════════════════════════════════════════

  /**
   * Build a text summary of all registered nodes for injection
   * into DeepSeek system prompts. Tells the AI exactly what node
   * types and fields are available.
   */
  buildRegistryContext(): string {
    const nodes = loadAllNodes();
    if (nodes.length === 0) return '';

    const triggers = nodes.filter((n) => n.category === 'trigger');
    const actions = nodes.filter((n) => n.category === 'action');

    const lines: string[] = [
      'REGISTERED NODES (ONLY use these exact node types):',
      '',
    ];

    if (triggers.length > 0) {
      lines.push('## Trigger Nodes');
      for (const t of triggers) {
        lines.push(`- nodeType: "${t.nodeType}" — ${t.displayName}: ${t.description}`);
        if (t.requiredFields.length > 0) {
          const reqs = t.requiredFields.map((f) => f.field);
          lines.push(`  Required fields: ${reqs.join(', ')}`);
        }
      }
      lines.push('');
    }

    lines.push('## Action Nodes');
    for (const a of actions) {
      lines.push(`- nodeType: "${a.nodeType}" — ${a.displayName}: ${a.description}`);
      const reqFields = a.requiredFields.filter((f) => f.required);
      if (reqFields.length > 0) {
        const reqs = reqFields.map((f) => `${f.field} (${f.type})`);
        lines.push(`  Required fields: ${reqs.join(', ')}`);
      }
      const optFields = a.optionalFields;
      if (optFields.length > 0) {
        const opts = optFields.map((f) => `${f.field} (${f.type})`);
        lines.push(`  Optional fields: ${opts.join(', ')}`);
      }
    }
    lines.push('');

    lines.push('IMPORTANT RULES:');
    lines.push('- ONLY use the nodeType values listed above. Do not invent new types.');
    lines.push('- Each action.type MUST exactly match one of the action nodeType values above.');
    lines.push('- Each trigger.type MUST exactly match one of the trigger nodeType values above.');
    lines.push('- Use the required and optional fields listed for each node in the config object.');
    lines.push('- Do not include fields that are not listed for that node type.');

    return lines.join('\n');
  },

  /**
   * Build a compact type list for constrained prompts
   */
  buildTypeList(): string {
    const nodes = loadAllNodes();
    const triggers = nodes.filter((n) => n.category === 'trigger').map((n) => n.nodeType);
    const actions = nodes.filter((n) => n.category === 'action').map((n) => n.nodeType);
    return `Triggers: [${triggers.join(', ')}] | Actions: [${actions.join(', ')}]`;
  },
};
