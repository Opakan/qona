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

    const promptTokens = userPrompt.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
    if (promptTokens.length === 0) return catalog.slice(0, limit);

    const scored = catalog.map((t) => {
      let score = 0;
      const titleLower = t.title.toLowerCase();
      const descLower = t.description.toLowerCase();
      const toolsLower = t.toolsUsed.map((u) => u.toLowerCase());
      const catLower = t.categories.map((c) => c.toLowerCase());

      for (const token of promptTokens) {
        if (titleLower.includes(token)) score += 5;
        if (toolsLower.some((tool) => tool.includes(token))) score += 4;
        if (catLower.some((cat) => cat.includes(token))) score += 3;
        if (descLower.includes(token)) score += 1;
      }

      return { template: t, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.template);
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
