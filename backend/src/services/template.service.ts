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
      const templatesDir = path.resolve(__dirname, '../knowledge/templates');
      if (!fs.existsSync(templatesDir)) {
        console.warn(`[TemplateService] Templates directory not found at ${templatesDir}`);
        return;
      }

      const files = fs.readdirSync(templatesDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(templatesDir, file);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const parsed = JSON.parse(raw) as Template;
          this.templates.set(parsed.id, parsed);
          this.templatesBySlug.set(parsed.slug, parsed);
        }
      }
      this.isLoaded = true;
      console.log(`[TemplateService] Loaded ${this.templates.size} automation templates`);
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
    clonedGraph.name = template.name;
    clonedGraph.description = template.description;
    clonedGraph.updatedAt = new Date().toISOString();

    for (const node of clonedGraph.nodes) {
      for (const [key, value] of Object.entries(customInputs)) {
        if (key.startsWith(`${node.id}_`)) {
          const paramName = key.replace(`${node.id}_`, '');
          node.params[paramName] = value;
        } else if (node.params[key] !== undefined || key in (node.params ?? {})) {
          node.params[key] = value;
        }
      }
    }

    return { graph: clonedGraph, template };
  }
}

export const templateService = new TemplateService();
