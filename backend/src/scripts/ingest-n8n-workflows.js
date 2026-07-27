import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WORKFLOWS_DIR = 'c:\\Users\\USER\\n8n\\workflows';
const KNOWLEDGE_TEMPLATES_DIR = join(__dirname, '..', 'knowledge', 'templates');

function sanitizeDefinition(def) {
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

function isTriggerNode(nodeType) {
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
  console.log(`[Ingest JS] Scanning directory: ${WORKFLOWS_DIR}`);

  if (!existsSync(WORKFLOWS_DIR)) {
    console.error(`[Ingest JS] Directory does not exist: ${WORKFLOWS_DIR}`);
    return;
  }

  const files = readdirSync(WORKFLOWS_DIR);
  const metaFiles = files.filter((f) => f.endsWith('_meta.json'));

  console.log(`[Ingest JS] Found ${metaFiles.length} metadata files.`);

  const templates = [];

  for (const metaFile of metaFiles) {
    try {
      const prefix = metaFile.replace('_meta.json', '');
      const workflowFile = `${prefix}_workflow.json`;
      const workflowPath = join(WORKFLOWS_DIR, workflowFile);

      if (!existsSync(workflowPath)) {
        console.warn(`[Ingest JS] Missing matching workflow file for ${metaFile}`);
        continue;
      }

      const metaRaw = readFileSync(join(WORKFLOWS_DIR, metaFile), 'utf-8');
      const wfRaw = readFileSync(workflowPath, 'utf-8');

      const meta = JSON.parse(metaRaw);
      const wfDef = sanitizeDefinition(JSON.parse(wfRaw));

      const nodes = wfDef.nodes ?? [];
      const nodeTypes = Array.from(new Set(nodes.map((n) => String(n.type)).filter(Boolean)));
      const triggerTypes = nodeTypes.filter(isTriggerNode);

      const template = {
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
      console.warn(`[Ingest JS] Error processing ${metaFile}:`, err.message);
    }
  }

  console.log(`[Ingest JS] Successfully parsed ${templates.length} n8n templates.`);

  // Save to fast cached catalog JSON
  if (!existsSync(KNOWLEDGE_TEMPLATES_DIR)) {
    mkdirSync(KNOWLEDGE_TEMPLATES_DIR, { recursive: true });
  }

  const indexFilePath = join(KNOWLEDGE_TEMPLATES_DIR, 'catalog.json');
  writeFileSync(indexFilePath, JSON.stringify(templates, null, 2), 'utf-8');
  console.log(`[Ingest JS] Saved catalog to: ${indexFilePath}`);

  // Optional DB Ingestion into Prisma if installed/connected
  try {
    const { getPrisma } = await import('../lib/prisma.js');
    const prisma = getPrisma();
    console.log('[Ingest JS] Inserting templates into PostgreSQL database via Prisma...');

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
          n8nDefinition: t.n8nDefinition,
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
          n8nDefinition: t.n8nDefinition,
          nodeTypes: t.nodeTypes,
          triggerTypes: t.triggerTypes,
        },
      });
      inserted++;
    }
    console.log(`[Ingest JS] Database upsert completed! Inserted/Updated ${inserted} records.`);
  } catch (dbErr) {
    console.log('[Ingest JS] Database sync notice:', dbErr.message);
    console.log('[Ingest JS] Local catalog JSON is ready for immediate production querying.');
  }
}

runIngestion()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Ingest JS] Uncaught error:', err);
    process.exit(1);
  });
