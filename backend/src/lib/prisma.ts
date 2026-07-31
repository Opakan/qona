import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';

let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
}

export { PrismaClient };
