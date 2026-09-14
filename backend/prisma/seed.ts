import { getPrisma } from '../src/lib/prisma.js';

const plans = [
  {
    name: 'Starter',
    slug: 'starter',
    description: 'Start building workflows with essential tools.',
    price: 1,
    currency: 'USD',
    interval: 'month',
    exports: 10,
    features: JSON.stringify(['10 workflow exports', 'Standard AI generation', 'n8n format export', 'Community support']),
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'For professionals and small teams.',
    price: 30,
    currency: 'USD',
    interval: 'month',
    exports: 100,
    features: JSON.stringify(['100 workflow exports', 'Advanced Bedrock Claude AI', 'All platform exports', 'Version history', 'Priority email support']),
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'For growing businesses, agencies, and teams.',
    price: 99,
    currency: 'USD',
    interval: 'month',
    exports: 1000,
    features: JSON.stringify(['Unlimited workflow exports', 'Custom AI fine-tuning', 'All platform exports', 'Unlimited version history', 'API access & webhooks', 'Dedicated 24/7 support']),
  },
];

async function seed() {
  const prisma = getPrisma();
  console.log('Seeding subscription plans...');

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
    console.log(`  ✓ ${plan.name}`);
  }

  console.log('Seeding complete.');
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
