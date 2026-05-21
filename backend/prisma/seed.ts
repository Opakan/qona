import { getPrisma } from '../src/lib/prisma.js';

const plans = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Start building workflows for free.',
    price: 0,
    currency: 'USD',
    interval: 'month',
    exports: 3,
    features: JSON.stringify(['3 workflow exports', 'Basic AI generation', 'n8n format', 'Community support']),
  },
  {
    name: 'Starter',
    slug: 'starter',
    description: 'For professionals and small teams.',
    price: 29,
    currency: 'USD',
    interval: 'month',
    exports: 50,
    features: JSON.stringify(['50 workflow exports', 'Advanced AI generation', 'All platform exports', 'Version history', 'Priority support']),
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'For growing businesses and agencies.',
    price: 99,
    currency: 'USD',
    interval: 'month',
    exports: 200,
    features: JSON.stringify(['200 workflow exports', 'Custom AI training', 'All platform exports', 'Unlimited versions', 'API access', 'Dedicated support']),
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
