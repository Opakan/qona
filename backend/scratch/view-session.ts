import { getPrisma } from '../src/lib/prisma.js';

async function main() {
  const prisma = getPrisma();
  const session = await prisma.workflowPlanningSession.findFirst({
    orderBy: { updatedAt: 'desc' },
  });

  if (!session) {
    console.log("No session found!");
    return;
  }

  console.log(`Session ID: ${session.id}`);
  console.log(`State: ${session.state}`);
  console.log(`WorkflowDraft:`, JSON.stringify(session.workflowDraft, null, 2));
}

main().catch(console.error);
