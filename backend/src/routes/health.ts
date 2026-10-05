import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  let dbStatus = 'unknown';
  let dbError: string | null = null;
  let dbHost = 'unknown';

  try {
    const { getPrisma } = await import('../lib/prisma.js');
    const { config } = await import('../config.js');
    try {
      const parsed = new URL(config.DATABASE_URL);
      dbHost = parsed.host;
    } catch {
      dbHost = 'unparseable';
    }

    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = 'disconnected';
    dbError = err?.message?.split('\n')?.[0] || String(err);
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      host: dbHost,
      error: dbError,
    },
  });
});

