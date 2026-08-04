import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const catalogPath = path.resolve(__dirname, '../knowledge/templates/catalog.json');
const nodesDir = path.resolve(__dirname, '../knowledge/nodes');
const tmpReposDir = path.resolve(process.cwd(), 'tmp_repos');

function getAllJsonFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    if (file === '.git' || file === 'node_modules') continue;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllJsonFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.json') && file !== 'package.json' && file !== 'tsconfig.json') {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

function calculateQualityScore(item) {
  let score = 0;
  const nodes = item.n8nDefinition?.nodes || item.nodes || [];
  score += nodes.length * 10;

  for (const node of nodes) {
    if (node.parameters && Object.keys(node.parameters).length > 0) score += 5;
    if (node.type) score += 2;
    if (node.name) score += 1;
  }

  const connections = item.n8nDefinition?.connections || item.connections || {};
  score += Object.keys(connections).length * 5;

  if (item.title && item.title.length > 5) score += 10;
  if (item.description && item.description.length > 10) score += 15;

  return score;
}

function getWorkflowSignature(name, nodes) {
  const normName = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nodeTypes = (nodes || []).map(n => n.type).filter(Boolean).sort().join('|');
  return `${normName}:::${nodeTypes}`;
}

function runIngestion() {
  console.log('[Ingestion] Reading existing catalog.json...');
  let existingCatalog = [];
  if (fs.existsSync(catalogPath)) {
    try {
      existingCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
    } catch (e) {
      console.warn('[Ingestion] Error reading existing catalog, starting fresh:', e.message);
    }
  }

  console.log(`[Ingestion] Current catalog count: ${existingCatalog.length}`);

  const catalogMap = new Map();
  let maxId = 0;

  for (const item of existingCatalog) {
    const numId = parseInt(item.id, 10);
    if (!isNaN(numId) && numId > maxId) maxId = numId;

    const sig = getWorkflowSignature(item.title, item.n8nDefinition?.nodes || []);
    item._score = calculateQualityScore(item);
    catalogMap.set(sig, item);
  }

  console.log('[Ingestion] Scanning imported GitHub repos...');
  const jsonFiles = getAllJsonFiles(tmpReposDir);
  console.log(`[Ingestion] Found ${jsonFiles.length} JSON files in cloned repositories.`);

  let newlyAdded = 0;
  let updatedExisting = 0;
  let skippedDuplicates = 0;

  for (const filePath of jsonFiles) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);

      // Check if this JSON is a valid n8n workflow
      const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : (Array.isArray(parsed.n8nDefinition?.nodes) ? parsed.n8nDefinition.nodes : null);
      if (!nodes || nodes.length === 0) continue;

      const baseName = path.basename(filePath, '.json').replace(/[-_]/g, ' ');
      const title = parsed.name || parsed.title || baseName;
      const description = parsed.description || `Automation workflow containing ${nodes.length} n8n nodes including ${nodes.slice(0, 3).map(n => n.name || n.type).join(', ')}.`;

      const nodeTypes = Array.from(new Set(nodes.map(n => n.type).filter(Boolean)));
      const triggerTypes = Array.from(new Set(nodes.filter(n => n.type && (n.type.toLowerCase().includes('trigger') || n.type.toLowerCase().includes('webhook'))).map(n => n.type)));

      const categories = ['Automation'];
      if (nodeTypes.some(t => t.includes('telegram') || t.includes('slack') || t.includes('discord'))) categories.push('Communication');
      if (nodeTypes.some(t => t.includes('openAi') || t.includes('langchain') || t.includes('ai'))) categories.push('AI');
      if (nodeTypes.some(t => t.includes('google') || t.includes('sheets') || t.includes('airtable'))) categories.push('Data');

      const toolsUsed = nodeTypes.map(t => t.replace('n8n-nodes-base.', '')).filter(Boolean);

      const newItem = {
        id: String(++maxId),
        title: title,
        description: description,
        categories: Array.from(new Set(categories)),
        toolsUsed: Array.from(new Set(toolsUsed)),
        nodeTypes: nodeTypes,
        triggerTypes: triggerTypes,
        featured: nodes.length >= 3,
        n8nDefinition: {
          nodes: nodes,
          connections: parsed.connections || parsed.n8nDefinition?.connections || {},
        },
      };

      newItem._score = calculateQualityScore(newItem);
      const sig = getWorkflowSignature(title, nodes);

      if (catalogMap.has(sig)) {
        const existing = catalogMap.get(sig);
        if (newItem._score > existing._score) {
          newItem.id = existing.id; // Retain original ID
          catalogMap.set(sig, newItem);
          updatedExisting++;
        } else {
          skippedDuplicates++;
        }
      } else {
        catalogMap.set(sig, newItem);
        newlyAdded++;
      }
    } catch (err) {
      // Ignore invalid JSON files
    }
  }

  const finalCatalog = Array.from(catalogMap.values()).map(item => {
    const copy = { ...item };
    delete copy._score;
    return copy;
  });

  console.log(`[Ingestion] Ingestion Complete!`);
  console.log(` - Newly added unique workflows: ${newlyAdded}`);
  console.log(` - Updated higher quality duplicates: ${updatedExisting}`);
  console.log(` - Discarded inferior duplicates: ${skippedDuplicates}`);
  console.log(` - Total catalog size: ${finalCatalog.length}`);

  fs.writeFileSync(catalogPath, JSON.stringify(finalCatalog, null, 2), 'utf-8');
  console.log(`[Ingestion] Saved updated catalog to ${catalogPath}`);
}

runIngestion();
