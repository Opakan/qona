import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ParsedTemplate } from '../scripts/ingest-n8n-workflows.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CATALOG_PATH = join(__dirname, '..', 'knowledge', 'templates', 'catalog.json');

let catalogCache: ParsedTemplate[] | null = null;

function getCatalog(): ParsedTemplate[] {
  if (catalogCache) return catalogCache;

  if (existsSync(CATALOG_PATH)) {
    try {
      const raw = readFileSync(CATALOG_PATH, 'utf-8');
      catalogCache = JSON.parse(raw) as ParsedTemplate[];
      console.log(`[TemplateSearchService] Loaded ${catalogCache.length} templates from catalog.json`);
      return catalogCache;
    } catch (err) {
      console.warn('[TemplateSearchService] Failed to read catalog.json:', (err as Error).message);
    }
  }

  return [];
}

export interface SearchOptions {
  query?: string;
  category?: string;
  tool?: string;
  limit?: number;
  offset?: number;
}

export const templateSearchService = {
  /** Reload catalog cache from disk */
  reload(): ParsedTemplate[] {
    catalogCache = null;
    return getCatalog();
  },

  /** Get template by ID */
  getById(id: string): ParsedTemplate | undefined {
    return getCatalog().find((t) => String(t.id) === String(id));
  },

  /** Search templates with text matching and category/tool filters */
  search(options: SearchOptions = {}): { total: number; templates: ParsedTemplate[] } {
    let items = getCatalog();
    const { query, category, tool, limit = 20, offset = 0 } = options;

    if (category) {
      const catLower = category.toLowerCase();
      items = items.filter((t) => t.categories.some((c) => c.toLowerCase().includes(catLower)));
    }

    if (tool) {
      const toolLower = tool.toLowerCase();
      items = items.filter((t) => t.toolsUsed.some((u) => u.toLowerCase().includes(toolLower)));
    }

    if (query && query.trim()) {
      const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
      items = items.filter((t) => {
        const text = `${t.title} ${t.description} ${t.toolsUsed.join(' ')} ${t.categories.join(' ')} ${t.nodeTypes.join(' ')}`.toLowerCase();
        return qTokens.some((tok) => text.includes(tok));
      });
    }

    const total = items.length;
    const paginated = items.slice(offset, offset + limit);

    return { total, templates: paginated };
  },

  /** RAG Helper: Find top N relevant n8n template workflows to inject as AI context */
  findRelevantTemplatesForAI(userPrompt: string, limit = 3): ParsedTemplate[] {
    const catalog = getCatalog();
    if (catalog.length === 0) return [];

    const cleanPrompt = (userPrompt || '').toLowerCase();
    const promptTokens = cleanPrompt.split(/[^a-z0-9_-]+/).filter((t) => t.length > 2);
    if (promptTokens.length === 0) return catalog.slice(0, limit);

    const scored = catalog.map((t) => {
      let score = 0;
      const titleLower = t.title.toLowerCase();
      const descLower = t.description.toLowerCase();
      const toolsLower = (t.toolsUsed || []).map((u) => u.toLowerCase());
      const catLower = (t.categories || []).map((c) => c.toLowerCase());
      const nodeTypesLower = (t.nodeTypes || []).map((n) => n.toLowerCase());

      for (const token of promptTokens) {
        if (titleLower.includes(token)) score += 8;
        if (toolsLower.some((tool) => tool.includes(token) || token.includes(tool))) score += 20;
        if (nodeTypesLower.some((nt) => nt.includes(token))) score += 15;
        if (catLower.some((cat) => cat.includes(token))) score += 5;
        if (descLower.includes(token)) score += 2;
      }

      // Popularity boost for community-proven templates
      const views = Number(t.totalViews) || 0;
      if (views > 0) {
        score += Math.min(Math.log10(views + 1) * 3, 10);
      }

      // Quality boost for templates that have complete definitions
      if (t.n8nDefinition && Array.isArray((t.n8nDefinition as any).nodes) && (t.n8nDefinition as any).nodes.length >= 2) {
        score += 5;
      }

      return { template: t, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored
      .filter((s) => s.score > 0)
      .slice(0, limit)
      .map((s) => s.template);
  },

  /** Format matched templates into high-signal few-shot exemplars for Claude (AWS Bedrock) */
  formatFewShotContext(templates: ParsedTemplate[]): string {
    if (!templates || templates.length === 0) return '';

    const lines: string[] = [
      '### VERIFIED n8n REAL-WORLD REFERENCE WORKFLOWS (FEW-SHOT IN-CONTEXT PATTERNS)',
      'Use these proven n8n production patterns for exact node types, official parameter expressions (e.g. {{ $json.body }} or {{ $json["data"] }}), and logical edge connections:',
      '',
    ];

    templates.forEach((t, index) => {
      lines.push(`--- REFERENCE TEMPLATE ${index + 1}: "${t.title}" ---`);
      if (t.toolsUsed && t.toolsUsed.length > 0) {
        lines.push(`- Integrations: ${t.toolsUsed.join(', ')}`);
      }

      const rawNodes = ((t.n8nDefinition as any)?.nodes as Array<Record<string, unknown>>) || [];
      const functionalNodes = rawNodes.filter((n) => {
        const typeStr = String(n.type || '').toLowerCase();
        return !typeStr.includes('stickynote');
      });

      if (functionalNodes.length > 0) {
        lines.push('- Pipeline Nodes:');
        functionalNodes.slice(0, 6).forEach((node, nodeIdx) => {
          const name = String(node.name || `Step ${nodeIdx + 1}`);
          const type = String(node.type || 'n8n-nodes-base.noOp');
          const params = (node.parameters as Record<string, unknown>) || {};
          
          // Extract high-signal parameters and expressions (filtering empty or giant objects)
          const paramSnippets: string[] = [];
          for (const [key, val] of Object.entries(params)) {
            if (val === null || val === undefined || val === '') continue;
            if (typeof val === 'string' && val.length > 0) {
              const preview = val.length > 80 ? `${val.slice(0, 80)}...` : val;
              paramSnippets.push(`${key}: "${preview}"`);
            } else if (typeof val === 'number' || typeof val === 'boolean') {
              paramSnippets.push(`${key}: ${val}`);
            }
            if (paramSnippets.length >= 4) break;
          }

          const paramStr = paramSnippets.length > 0 ? ` [Config: ${paramSnippets.join(', ')}]` : '';
          lines.push(`  ${nodeIdx + 1}. [${name}] (${type})${paramStr}`);
        });

        // Extract connection flow
        const connections = ((t.n8nDefinition as any)?.connections as Record<string, any>) || {};
        const flowPairs: string[] = [];
        for (const [source, connData] of Object.entries(connections)) {
          const mainOutputs = connData?.main;
          if (Array.isArray(mainOutputs)) {
            for (const branch of mainOutputs) {
              if (Array.isArray(branch)) {
                for (const target of branch) {
                  if (target?.node) {
                    flowPairs.push(`${source} -> ${target.node}`);
                  }
                }
              }
            }
          }
          if (flowPairs.length >= 5) break;
        }

        if (flowPairs.length > 0) {
          lines.push(`- Connection Topology: ${flowPairs.join(' | ')}`);
        }
      }
      lines.push('');
    });

    lines.push('IMPORTANT: Mirror the canonical node naming, parameter expressions, and flow shown above where applicable.');
    return lines.join('\n');
  },

  /** Get all available categories across catalog */
  getCategories(): string[] {
    const set = new Set<string>();
    for (const t of getCatalog()) {
      for (const c of t.categories) set.add(c);
    }
    return Array.from(set).sort();
  },

  /** Get all tools used across catalog */
  getTools(): string[] {
    const set = new Set<string>();
    for (const t of getCatalog()) {
      for (const tool of t.toolsUsed) set.add(tool);
    }
    return Array.from(set).sort();
  },
};

