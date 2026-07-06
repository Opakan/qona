import { getPrisma } from '../src/lib/prisma.js';

async function main() {
  const prisma = getPrisma();
  const workflows = await prisma.workflow.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log(`Found ${workflows.length} workflows:`);
  for (const w of workflows) {
    console.log(`\n--- Workflow: ${w.name} (${w.id}) ---`);
    console.log(JSON.stringify(w.definition, null, 2));
  }
}

main().catch(console.error);
