import { getPrisma } from '../lib/prisma.js';

export async function upsertUser(authId: string, email: string, name: string) {
  const prisma = getPrisma();
  return prisma.user.upsert({
    where: { authId },
    update: { email, name },
    create: { authId, email, name },
  });
}

export async function getUserByAuthId(authId: string) {
  const prisma = getPrisma();
  return prisma.user.findUnique({ where: { authId } });
}
