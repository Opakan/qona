import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WORKFLOWS_DIR = 'c:\\Users\\USER\\n8n\\workflows';
const KNOWLEDGE_TEMPLATES_DIR = join(__dirname, '..', 'knowledge', 'templates');

export interface ParsedTemplate {
  id: string;
  title: string;
  description: string;
  toolsUsed: string[];
  categories: string[];
  tutorialUrl?: string;
  templateUrl?: string;
  platform: string;
  featured: boolean;
  contributorName?: string;
  n8nDefinition: Record<string, unknown>;
  nodeTypes: string[];
  triggerTypes: string[];
  updatedAt: string;
}

function sanitizeDefinition(def: Record<string, unknown>): Record<string, unknown> {
  let jsonStr = JSON.stringify(def);

  // 1. Specific API key patterns (OpenAI, Apify, Pinterest, etc.)
  jsonStr = jsonStr
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, 'sk-REDACTED_SECRET')
    .replace(/apify_api_[A-Za-z0-9_-]+/g, 'apify_api_REDACTED_SECRET')
    .replace(/pina_[A-Za-z0-9_-]+/g, 'pina_REDACTED_SECRET')
    .replace(/pica_[A-Za-z0-9_-]+/g, 'pica_REDACTED_SECRET')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, 'eyJ_REDACTED_JWT');

  // 2. Generic Key/Token field matches
  jsonStr = jsonStr
    .replace(/"(api[Kk]ey|password|secret|token|auth|access_token|accessToken|api_key|client_secret|clientSecret)":\s*"[^"]+"/g, '"$1": "{{SENSITIVE_REDACTED}}"');

  return JSON.parse(jsonStr);
}

function isTriggerNode(nodeType: string): boolean {
  const lower = nodeType.toLowerCase();
  return (
    lower.endsWith('trigger') ||
    lower.includes('webhook') ||
    lower.includes('cron') ||
    lower.includes('schedule') ||
    lower.includes('poll')
  );
}

export async function runIngestion() {
  console.log(`[Ingest] Scanning directory: ${WORKFLOWS_DIR}`);

  if (!existsSync(WORKFLOWS_DIR)) {
    console.error(`[Ingest] Directory does not exist: ${WORKFLOWS_DIR}`);
    return;
  }

  const files = readdirSync(WORKFLOWS_DIR);
  const metaFiles = files.filter((f) => f.endsWith('_meta.json'));

  console.log(`[Ingest] Found ${metaFiles.length} metadata files.`);

  const templates: ParsedTemplate[] = [];

  for (const metaFile of metaFiles) {
    try {
      const prefix = metaFile.replace('_meta.json', '');
      const workflowFile = `${prefix}_workflow.json`;
      const workflowPath = join(WORKFLOWS_DIR, workflowFile);

      if (!existsSync(workflowPath)) {
        console.warn(`[Ingest] Missing matching workflow file for ${metaFile}`);
        continue;
      }

      const metaRaw = readFileSync(join(WORKFLOWS_DIR, metaFile), 'utf-8');
      const wfRaw = readFileSync(workflowPath, 'utf-8');

      const meta = JSON.parse(metaRaw);
      const wfDef = sanitizeDefinition(JSON.parse(wfRaw));

      const nodes = (wfDef.nodes as Array<Record<string, unknown>>) ?? [];
      const nodeTypes = Array.from(new Set(nodes.map((n) => String(n.type)).filter(Boolean)));
      const triggerTypes = nodeTypes.filter(isTriggerNode);

      const template: ParsedTemplate = {
        id: String(meta.id),
        title: meta.title ?? prefix,
        description: meta.description ?? '',
        toolsUsed: meta.tools_used ?? [],
        categories: meta.categories ?? [],
        tutorialUrl: meta.tutorial_url,
        templateUrl: meta.template_url,
        platform: meta.platform ?? 'n8n',
        featured: meta.featured ?? false,
        contributorName: meta.contributor_name,
        n8nDefinition: wfDef,
        nodeTypes,
        triggerTypes,
        updatedAt: meta.created_at ?? new Date().toISOString(),
      };

      templates.push(template);
    } catch (err) {
      console.warn(`[Ingest] Error processing ${metaFile}:`, (err as Error).message);
    }
  }

  console.log(`[Ingest] Successfully parsed ${templates.length} n8n templates.`);

  // 1. Save to local fast cached JSON index
  if (!existsSync(KNOWLEDGE_TEMPLATES_DIR)) {
    mkdirSync(KNOWLEDGE_TEMPLATES_DIR, { recursive: true });
  }

  const indexFilePath = join(KNOWLEDGE_TEMPLATES_DIR, 'catalog.json');
  writeFileSync(indexFilePath, JSON.stringify(templates, null, 2), 'utf-8');
  console.log(`[Ingest] Saved full template catalog to: ${indexFilePath}`);

  // 2. Database Ingestion into Prisma (if DB configured)
  try {
    const { getPrisma } = await import('../lib/prisma.js');
    const prisma = getPrisma();
    console.log('[Ingest] Inserting templates into PostgreSQL database via Prisma...');

    let inserted = 0;
    for (const t of templates) {
      await prisma.templateWorkflow.upsert({
        where: { id: t.id },
        update: {
          title: t.title,
          description: t.description,
          toolsUsed: t.toolsUsed,
          categories: t.categories,
          tutorialUrl: t.tutorialUrl,
          templateUrl: t.templateUrl,
          platform: t.platform,
          featured: t.featured,
          contributorName: t.contributorName,
          n8nDefinition: t.n8nDefinition as any,
          nodeTypes: t.nodeTypes,
          triggerTypes: t.triggerTypes,
        },
        create: {
          id: t.id,
          title: t.title,
          description: t.description,
          toolsUsed: t.toolsUsed,
          categories: t.categories,
          tutorialUrl: t.tutorialUrl,
          templateUrl: t.templateUrl,
          platform: t.platform,
          featured: t.featured,
          contributorName: t.contributorName,
          n8nDefinition: t.n8nDefinition as any,
          nodeTypes: t.nodeTypes,
          triggerTypes: t.triggerTypes,
        },
      });
      inserted++;
    }
    console.log(`[Ingest] Database upsert completed! Inserted/Updated ${inserted} records.`);
  } catch (dbErr) {
    console.warn('[Ingest] Database upsert skipped or failed:', (dbErr as Error).message);
    console.log('[Ingest] Local catalog JSON remains available for offline querying.');
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('ingest-n8n-workflows.ts')) {
  runIngestion()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Ingest] Uncaught error:', err);
      process.exit(1);
    });
}
