import fs from 'node:fs';
import { exec } from 'child_process';
import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();
const port = Number.isInteger(config.PORT) && config.PORT > 0 ? config.PORT : parseInt(process.env.PORT || '8080', 10);

app.listen(port, '0.0.0.0', () => {
  console.log(`[Qona API] Server running on http://0.0.0.0:${port}`);
  console.log(`[Qona API] Environment: ${config.NODE_ENV}`);

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
    const schemaPath = fs.existsSync('prisma/schema.prisma')
      ? 'prisma/schema.prisma'
      : fs.existsSync('backend/prisma/schema.prisma')
        ? 'backend/prisma/schema.prisma'
        : null;

    if (schemaPath) {
      console.log(`[Qona API] Synchronizing Prisma schema with database using ${schemaPath}...`);
      exec(`npx prisma db push --accept-data-loss --schema=${schemaPath}`, (error, stdout) => {
        if (error) {
          console.warn('[Qona API] Prisma DB push warning:', error.message);
        } else {
          console.log('[Qona API] Prisma DB push completed successfully.');
        }
      });
    }
  }
});
