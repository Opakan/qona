import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KNOWLEDGE_TEMPLATES_DIR = join(__dirname, '..', 'knowledge', 'templates');
const FRONTEND_CATALOG_PATH = join(__dirname, '..', '..', '..', 'frontend', 'public', 'templates-catalog.json');
const SCRATCH_INDEX_PATH = join(__dirname, '..', '..', '..', 'scratch_templates_index.json');

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
  totalViews?: number;
  recentViews?: number;
  updatedAt: string;
}

export function sanitizeDefinition(def: Record<string, unknown>): Record<string, unknown> {
  let jsonStr = JSON.stringify(def);

  // Redact specific API keys & tokens
  jsonStr = jsonStr
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, 'sk-REDACTED_SECRET')
    .replace(/apify_api_[A-Za-z0-9_-]+/g, 'apify_api_REDACTED_SECRET')
    .replace(/pina_[A-Za-z0-9_-]+/g, 'pina_REDACTED_SECRET')
    .replace(/pica_[A-Za-z0-9_-]+/g, 'pica_REDACTED_SECRET')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, 'eyJ_REDACTED_JWT')
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
    lower.includes('poll') ||
    lower.includes('manual')
  );
}

function normalizeTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreTemplate(item: {
  name: string;
  totalViews?: number;
  user?: { verified?: boolean };
  nodes?: Array<{ name?: string }>;
  hasFullDef?: boolean;
  createdAt?: string;
}): number {
  let score = 0;
  if (item.hasFullDef) score += 30; // already verified working definition
  if (item.user?.verified) score += 20;
  const views = Number(item.totalViews) || 0;
  score += Math.min(Math.log10(views + 1) * 8, 30);

  const nodes = item.nodes || [];
  if (nodes.length >= 2) score += 10;
  if (nodes.length >= 4) score += 5;

  const hasTrigger = nodes.some((n) => isTriggerNode(n.name || ''));
  if (hasTrigger) score += 10;

  if (item.createdAt && item.createdAt > '2024-01-01') score += 5;
  return score;
}

export async function runCommunityIngestion(options: { maxFullFetches?: number } = {}) {
  const { maxFullFetches = 300 } = options;
  console.log('🚀 [Ingest-Community] Starting n8n community templates ingestion & deduplication...');

  // 1. Load raw 13,129 community index
  let rawData: { workflows: Array<any>; totalWorkflows: number };
  if (existsSync(SCRATCH_INDEX_PATH)) {
    console.log(`[Ingest-Community] Reading cached index from ${SCRATCH_INDEX_PATH}...`);
    rawData = JSON.parse(readFileSync(SCRATCH_INDEX_PATH, 'utf-8'));
  } else {
    console.log('[Ingest-Community] Fetching 13,129 workflows index from https://api.n8n.io/api/templates/workflows...');
    const res = await fetch('https://api.n8n.io/api/templates/workflows');
    if (!res.ok) throw new Error(`Failed to fetch n8n index: ${res.status}`);
    rawData = (await res.json()) as any;
  }

  const rawWorkflows = rawData.workflows || [];
  console.log(`[Ingest-Community] Found ${rawWorkflows.length} community workflows in raw index.`);

  // 2. Load existing catalog (2,903 workflows)
  const existingCatalogPath = join(KNOWLEDGE_TEMPLATES_DIR, 'catalog.json');
  let existingCatalog: ParsedTemplate[] = [];
  if (existsSync(existingCatalogPath)) {
    try {
      existingCatalog = JSON.parse(readFileSync(existingCatalogPath, 'utf-8'));
      console.log(`[Ingest-Community] Loaded ${existingCatalog.length} existing verified templates.`);
    } catch (err) {
      console.warn('[Ingest-Community] Could not parse existing catalog.json:', err);
    }
  }

  const existingById = new Map<string, ParsedTemplate>();
  for (const t of existingCatalog) {
    existingById.set(String(t.id), t);
  }

  // 3. Deduplication & Quality Assessment
  console.log('[Ingest-Community] Running deduplication and quality scoring...');
  const titleGroups = new Map<string, Array<{ raw: any; score: number; hasFullDef: boolean }>>();

  for (const wf of rawWorkflows) {
    const id = String(wf.id);
    const hasFullDef = existingById.has(id);
    const score = scoreTemplate({
      name: wf.name,
      totalViews: wf.totalViews,
      user: wf.user,
      nodes: wf.nodes,
      hasFullDef,
      createdAt: wf.createdAt,
    });

    const normTitle = normalizeTitle(wf.name);
    if (!titleGroups.has(normTitle)) {
      titleGroups.set(normTitle, []);
    }
    titleGroups.get(normTitle)!.push({ raw: wf, score, hasFullDef });
  }

  // Pick top scoring candidate per normalized title
  const deduplicatedRaw: any[] = [];
  let duplicatesRemoved = 0;

  for (const [, candidates] of titleGroups.entries()) {
    if (candidates.length > 1) {
      candidates.sort((a, b) => b.score - a.score);
      deduplicatedRaw.push(candidates[0].raw);
      duplicatesRemoved += candidates.length - 1;
    } else {
      deduplicatedRaw.push(candidates[0].raw);
    }
  }

  console.log(`[Ingest-Community] Deduplication complete:`);
  console.log(`  - Unique high-quality workflows: ${deduplicatedRaw.length}`);
  console.log(`  - Duplicate/inferior workflows removed: ${duplicatesRemoved}`);

  // Sort deduplicated by popularity / views
  deduplicatedRaw.sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0));

  // 4. Determine which new templates to fetch full definitions for
  const needsFullFetch: any[] = [];
  for (const wf of deduplicatedRaw) {
    const id = String(wf.id);
    if (!existingById.has(id)) {
      needsFullFetch.push(wf);
    }
  }

  const fetchTargets = needsFullFetch.slice(0, maxFullFetches);
  console.log(`[Ingest-Community] Fetching full definitions for top ${fetchTargets.length} new community workflows...`);

  const fetchedDefinitions = new Map<string, any>();
  const batchSize = 15;
  for (let i = 0; i < fetchTargets.length; i += batchSize) {
    const batch = fetchTargets.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (wf) => {
        try {
          const res = await fetch(`https://api.n8n.io/api/templates/workflows/${wf.id}`);
          if (!res.ok) return;
          const data = (await res.json()) as any;
          if (data?.workflow?.workflow?.nodes?.length >= 2) {
            fetchedDefinitions.set(String(wf.id), data.workflow);
          }
        } catch {
          // Skip on network error
        }
      })
    );
    if ((i + batchSize) % 60 === 0 || i + batchSize >= fetchTargets.length) {
      console.log(`  [Progress] Fetched ${Math.min(i + batchSize, fetchTargets.length)}/${fetchTargets.length} definitions...`);
    }
  }

  console.log(`[Ingest-Community] Successfully fetched ${fetchedDefinitions.size} verified full workflow definitions.`);

  // 5. Assemble the Master Unified Catalog
  const unifiedCatalog: ParsedTemplate[] = [];

  // First, add all existing templates (with their definitions and updated views if found)
  for (const existing of existingCatalog) {
    const rawMatch = rawWorkflows.find((w: any) => String(w.id) === String(existing.id));
    if (rawMatch) {
      existing.totalViews = rawMatch.totalViews;
      existing.recentViews = rawMatch.recentViews;
    }
    unifiedCatalog.push(existing);
  }

  const existingIdSet = new Set(existingCatalog.map((t) => String(t.id)));

  // Next, add the deduplicated new workflows
  for (const wf of deduplicatedRaw) {
    const id = String(wf.id);
    if (existingIdSet.has(id)) continue;

    const fullDetail = fetchedDefinitions.get(id);
    const n8nDef = fullDetail?.workflow ? sanitizeDefinition(fullDetail.workflow) : {
      name: wf.name,
      nodes: (wf.nodes || []).map((n: any, idx: number) => ({
        id: `node_${idx}`,
        name: n.displayName || n.name,
        type: n.name,
        typeVersion: n.typeVersion || 1,
        position: [200 + idx * 300, 300],
        parameters: n.defaults || {},
      })),
      connections: {},
    };

    const nodeTypes: string[] = Array.from(
      new Set(
        (wf.nodes || [])
          .map((n: any) => n.name)
          .filter(Boolean)
      )
    );

    const triggerTypes = nodeTypes.filter(isTriggerNode);

    // Extract categories
    const categoriesSet = new Set<string>();
    for (const n of wf.nodes || []) {
      for (const cat of n.nodeCategories || []) {
        if (cat.name) categoriesSet.add(cat.name);
      }
    }
    if (categoriesSet.size === 0) categoriesSet.add('Automation');

    // Extract tools used
    const toolsSet = new Set<string>();
    for (const n of wf.nodes || []) {
      const displayName = n.displayName || '';
      if (displayName && !displayName.toLowerCase().includes('sticky note')) {
        toolsSet.add(displayName);
      }
    }

    const template: ParsedTemplate = {
      id,
      title: wf.name,
      description: fullDetail?.description || `Automated n8n workflow by ${wf.user?.username || 'community'}. Connects ${Array.from(toolsSet).slice(0, 4).join(', ')}.`,
      toolsUsed: Array.from(toolsSet).slice(0, 8),
      categories: Array.from(categoriesSet).slice(0, 5),
      tutorialUrl: fullDetail?.tutorialUrl || undefined,
      templateUrl: `https://n8n.io/workflows/${id}`,
      platform: 'n8n',
      featured: (wf.totalViews || 0) > 10000 || (wf.user?.verified && (wf.totalViews || 0) > 2000),
      contributorName: wf.user?.username || 'n8n Community',
      n8nDefinition: n8nDef,
      nodeTypes,
      triggerTypes,
      totalViews: wf.totalViews || 0,
      recentViews: wf.recentViews || 0,
      updatedAt: wf.createdAt || new Date().toISOString(),
    };

    unifiedCatalog.push(template);
  }

  console.log(`[Ingest-Community] Total unified templates in catalog: ${unifiedCatalog.length}`);

  // 6. Save backend knowledge catalog
  if (!existsSync(KNOWLEDGE_TEMPLATES_DIR)) {
    mkdirSync(KNOWLEDGE_TEMPLATES_DIR, { recursive: true });
  }

  writeFileSync(existingCatalogPath, JSON.stringify(unifiedCatalog), 'utf-8');
  console.log(`[Ingest-Community] Saved updated backend catalog to: ${existingCatalogPath}`);

  // 7. Generate lightweight frontend catalog
  const frontendTemplates = unifiedCatalog.map((t) => {
    const rawNodes = (t.n8nDefinition?.nodes as any[]) || [];
    const graphNodes = rawNodes.map((n: any, idx: number) => ({
      id: String(n.id || `n_${idx}`),
      name: n.name || `Node ${idx + 1}`,
      type: n.type || 'n8n-nodes-base.noOp',
      label: n.name || n.displayName || 'Step',
      position: Array.isArray(n.position) ? { x: n.position[0], y: n.position[1] } : (n.position || { x: 200 + idx * 300, y: 300 }),
      config: n.parameters || {},
      connections: [],
    }));

    return {
      id: String(t.id),
      slug: `n8n-${t.id}`,
      name: t.title,
      title: t.title,
      description: t.description,
      category: t.categories[0] || 'AI & Automation',
      categories: t.categories,
      icon: t.nodeTypes[0] || 'Zap',
      difficulty: graphNodes.length > 8 ? 'Advanced' : graphNodes.length > 4 ? 'Intermediate' : 'Beginner',
      plainEnglishSummary: [
        `Triggers automatically via ${t.triggerTypes[0] || 'n8n Trigger'}`,
        `Automates pipeline with ${t.toolsUsed.slice(0, 3).join(', ') || 'integrated tools'}`,
      ],
      tags: [...t.categories, ...t.toolsUsed, ...t.nodeTypes.slice(0, 5)],
      toolsUsed: t.toolsUsed,
      featured: Boolean(t.featured),
      totalViews: t.totalViews || 0,
      platform: t.platform,
      graph: {
        metadata: {
          id: `graph_${t.id}`,
          name: t.title,
          description: t.description,
          version: 1,
          tags: t.categories,
        },
        nodes: graphNodes,
        edges: [],
      },
    };
  });

  writeFileSync(FRONTEND_CATALOG_PATH, JSON.stringify(frontendTemplates), 'utf-8');
  const frontendSizeMB = (readFileSync(FRONTEND_CATALOG_PATH).length / 1024 / 1024).toFixed(2);
  console.log(`[Ingest-Community] Saved frontend catalog to: ${FRONTEND_CATALOG_PATH} (Size: ${frontendSizeMB} MB)`);

  console.log('✅ [Ingest-Community] Ingestion & deduplication successfully finished!');
  return { total: unifiedCatalog.length, duplicatesRemoved, fetchedFullCount: fetchedDefinitions.size };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('ingest-n8n-community.ts')) {
  runCommunityIngestion({ maxFullFetches: 250 })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Ingest-Community] Error:', err);
      process.exit(1);
    });
}
