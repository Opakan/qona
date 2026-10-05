import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';

let prisma: PrismaClient | null = null;

function ensurePrismaClientReady() {
  try {
    const root = process.cwd();
    const bundleDir = path.join(root, '.prisma_bundle');
    const targetDir = path.join(root, 'node_modules', '.prisma');
    const targetSchema = path.join(targetDir, 'client', 'schema.prisma');

    if (fs.existsSync(bundleDir) && !fs.existsSync(targetSchema)) {
      fs.mkdirSync(path.join(targetDir, 'client'), { recursive: true });
      fs.cpSync(bundleDir, targetDir, { recursive: true, force: true });
      console.log('[Prisma Failsafe] Restored .prisma from .prisma_bundle');
    }
  } catch (err) {
    console.warn('[Prisma Failsafe Warning]:', err);
  }
}

export function getPrisma(): PrismaClient {
  if (!prisma) {
    ensurePrismaClientReady();
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
