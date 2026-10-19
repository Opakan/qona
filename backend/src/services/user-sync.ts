import { db } from './db.js';
import { getPrisma } from '../lib/prisma.js';

const userIdCache = new Map<string, { id: string; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function resolveUserId(authId: string, email?: string, name?: string): Promise<string> {
  const cached = userIdCache.get(authId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.id;
  }

  const prisma = getPrisma();

  // 1. Check if user exists by authId
  let user = await prisma.user.findUnique({ where: { authId } });
  if (user) {
    userIdCache.set(authId, { id: user.id, cachedAt: Date.now() });
    return user.id;
  }

  // 2. Check if user exists by email (to avoid P2002 unique constraint violations)
  if (email) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { authId, name: name ?? user.name },
      });
      userIdCache.set(authId, { id: user.id, cachedAt: Date.now() });
      return user.id;
    }
  }

  // 3. Safe upsert with fallback email & name
  const cleanEmail = email || `${authId}@qonace.internal`;
  const cleanName = name || cleanEmail.split('@')[0] || authId.slice(0, 8);

  try {
    user = await prisma.user.upsert({
      where: { authId },
      update: { email: cleanEmail, name: cleanName },
      create: { authId, email: cleanEmail, name: cleanName },
    });
    userIdCache.set(authId, { id: user.id, cachedAt: Date.now() });
    return user.id;
  } catch {
    // If unique constraint on email still collisions, find by email again
    user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (user) {
      userIdCache.set(authId, { id: user.id, cachedAt: Date.now() });
      return user.id;
    }
    throw new Error('Failed to resolve or provision user account');
  }
}

export async function upsertUser(authId: string, email: string, name: string) {
  return db.user.upsertByAuthId({ authId, email, name });
}

export async function getUserByAuthId(authId: string) {
  return db.user.findByAuthId(authId);
}
