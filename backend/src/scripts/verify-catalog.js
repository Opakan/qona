import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const catalogPath = join(__dirname, '..', 'knowledge', 'templates', 'catalog.json');
const raw = readFileSync(catalogPath, 'utf-8');
const catalog = JSON.parse(raw);

console.log(`[Verify] Catalog loaded successfully! Total n8n workflows: ${catalog.length}`);

// Sample searches
const slackWorkflows = catalog.filter((t) =>
  t.title.toLowerCase().includes('slack') ||
  t.toolsUsed.some((u) => u.toLowerCase().includes('slack')) ||
  t.categories.some((c) => c.toLowerCase().includes('slack'))
);

console.log(`[Verify] Found ${slackWorkflows.length} workflows involving Slack.`);

const aiWorkflows = catalog.filter((t) =>
  t.categories.some((c) => c.toLowerCase() === 'ai') ||
  t.title.toLowerCase().includes('ai') ||
  t.toolsUsed.some((u) => u.toLowerCase().includes('openai'))
);

console.log(`[Verify] Found ${aiWorkflows.length} AI automation workflows.`);

console.log('[Verify] Top 3 sample titles:');
catalog.slice(0, 3).forEach((t, i) => {
  console.log(`  ${i + 1}. [ID ${t.id}] ${t.title} (${t.toolsUsed.join(', ')})`);
});
