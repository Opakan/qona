import { exec } from 'child_process';
import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();
const port = Number.isInteger(config.PORT) && config.PORT > 0 ? config.PORT : 4000;

app.listen(port, '0.0.0.0', () => {
  console.log(`[Qona API] Server running on http://0.0.0.0:${port}`);
  console.log(`[Qona API] Environment: ${config.NODE_ENV}`);

  if (process.env.DATABASE_URL) {
    console.log('[Qona API] Synchronizing Prisma schema with database...');
    exec('npx prisma db push --accept-data-loss --schema=backend/prisma/schema.prisma', (error, stdout) => {
      if (error) {
        console.warn('[Qona API] Prisma DB push warning:', error.message);
      } else {
        console.log('[Qona API] Prisma DB push completed successfully.');
      }
    });
  }
});
