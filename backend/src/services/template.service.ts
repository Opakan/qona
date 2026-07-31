import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Template, InternalGraph } from '@qona/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TemplateService {
  private templates: Map<string, Template> = new Map();
  private templatesBySlug: Map<string, Template> = new Map();
  private isLoaded = false;

  constructor() {
    this.loadTemplates();
  }

  public loadTemplates(): void {
    if (this.isLoaded) return;
    try {
      const candidates = [
        path.resolve(__dirname, '../knowledge/templates'),
        path.resolve(__dirname, '../src/knowledge/templates'),
        path.resolve(process.cwd(), 'backend/src/knowledge/templates'),
        path.resolve(process.cwd(), 'src/knowledge/templates'),
      ];
      let templatesDir = candidates[0];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          templatesDir = cand;
          break;
        }
      }
      if (!fs.existsSync(templatesDir)) {
        console.warn(`[TemplateService] Templates directory not found at ${templatesDir}`);
        return;
      }

      const files = fs.readdirSync(templatesDir);
      for (const file of files) {
        if (file === 'catalog.json') {
          try {
            const catalogRaw = fs.readFileSync(path.join(templatesDir, file), 'utf-8');
            const catalogItems = JSON.parse(catalogRaw) as Array<Record<string, any>>;
            for (const item of catalogItems) {
              const templateObj: any = {
                id: String(item.id),
                slug: `n8n-${item.id}`,
                name: item.title,
                title: item.title,
                description: item.description,
                category: item.categories?.[0] ?? 'Automation',
                tags: [...(item.categories ?? []), ...(item.toolsUsed ?? []), ...(item.nodeTypes ?? [])],
                toolsUsed: item.toolsUsed ?? [],
                featured: Boolean(item.featured),
                platform: item.platform ?? 'n8n',
                tutorialUrl: item.tutorialUrl,
                contributorName: item.contributorName,
                n8nDefinition: item.n8nDefinition,
                nodeTypes: item.nodeTypes ?? [],
                triggerTypes: item.triggerTypes ?? [],
                graph: {
                  id: `graph_${item.id}`,
                  name: item.title,
                  description: item.description,
                  version: 1,
                  nodes: (item.n8nDefinition?.nodes ?? []).map((n: any) => ({
                    id: n.id ?? n.name,
                    name: n.name ?? n.type,
                    type: n.type,
                    params: n.parameters ?? {},
                    position: n.position ? (Array.isArray(n.position) ? { x: n.position[0], y: n.position[1] } : n.position) : { x: 200, y: 300 },
                  })),
                  edges: [],
                  metadata: { n8nDefinition: item.n8nDefinition },
                  status: 'DRAFT',
                  updatedAt: new Date().toISOString(),
                },
              };
              this.templates.set(templateObj.id, templateObj);
              this.templatesBySlug.set(templateObj.slug, templateObj);
            }
            console.log(`[TemplateService] Ingested ${catalogItems.length} n8n templates from catalog.json`);
          } catch (cErr) {
            console.warn('[TemplateService] Failed to load catalog.json:', cErr);
          }
        } else if (file.endsWith('.json')) {
          const filePath = path.join(templatesDir, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(raw) as Template;
          if (parsed.id) {
            this.templates.set(parsed.id, parsed);
            if (parsed.slug) this.templatesBySlug.set(parsed.slug, parsed);
          }
        }
      }
      this.isLoaded = true;
      console.log(`[TemplateService] Loaded ${this.templates.size} total automation templates`);
    } catch (err) {
      console.error('[TemplateService] Failed to load templates:', err);
    }
  }

  public getAllTemplates(): Template[] {
    this.loadTemplates();
    return Array.from(this.templates.values());
  }

  public getFeaturedTemplates(): Template[] {
    return this.getAllTemplates().filter((t) => t.featured);
  }

  public getTemplateById(id: string): Template | undefined {
    this.loadTemplates();
    return this.templates.get(id);
  }

  public getTemplateBySlug(slug: string): Template | undefined {
    this.loadTemplates();
    return this.templatesBySlug.get(slug);
  }

  public searchTemplates(query: string): Template[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllTemplates();
    return this.getAllTemplates().filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  public cloneTemplate(
    templateId: string,
    customInputs: Record<string, string> = {}
  ): { graph: InternalGraph; template: Template } | undefined {
    const template = this.getTemplateById(templateId) ?? this.getTemplateBySlug(templateId);
    if (!template) return undefined;

    const clonedGraph: InternalGraph = JSON.parse(JSON.stringify(template.graph));
    clonedGraph.id = `graph_${Date.now()}`;
    if (!clonedGraph.metadata) {
      clonedGraph.metadata = {
        name: template.name,
        description: template.description || '',
        version: 1,
        tags: [],
      };
    } else {
      clonedGraph.metadata.name = template.name;
      clonedGraph.metadata.description = template.description || '';
    }
    clonedGraph.updatedAt = new Date().toISOString();

    for (const node of clonedGraph.nodes) {
      if (!node.config) node.config = {};
      for (const [key, value] of Object.entries(customInputs)) {
        if (key.startsWith(`${node.id}_`)) {
          const paramName = key.replace(`${node.id}_`, '');
          node.config[paramName] = value;
        } else if (node.config[key] !== undefined || key in node.config) {
          node.config[key] = value;
        }
      }
    }

    return { graph: clonedGraph, template };
  }
}

export const templateService = new TemplateService();
