import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findWorkspaceRoot(startDir: string): string {
  let dir = startDir;
  while (dir && dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'shared'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

function parseEnv(filePath: string, envObj: Record<string, string>) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      let val = trimmed.slice(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envObj[key] = val;
    }
  } catch (err) {
    console.warn(`[Qona Config] Failed to parse env file ${filePath}:`, err);
  }
}

const envObj: Record<string, string> = {};
const rootDir = findWorkspaceRoot(__dirname);
parseEnv(path.join(rootDir, '.env'), envObj);
parseEnv(path.join(rootDir, 'backend', '.env'), envObj);

for (const [key, val] of Object.entries(envObj)) {
  if (process.env[key] === undefined) {
    process.env[key] = val;
  }
}

export const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://qona:qona_dev@localhost:5432/qona_dev',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  SUPABASE_URL: process.env.SUPABASE_URL ?? 'https://icxlfpmldbpjjqxmjpol.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? 'sb_publishable_n70nfEz0nzetwwsrtG3LYA_AuKWCLg4',
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ?? '',

  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? '',

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022',

  // AWS Bedrock Configuration
  AWS_REGION: process.env.AWS_REGION ?? 'us-west-2',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  BEDROCK_SONNET_MODEL_ID: process.env.BEDROCK_SONNET_MODEL_ID ?? 'us.anthropic.claude-opus-4-5-20251101-v1:0',
  BEDROCK_HAIKU_MODEL_ID: process.env.BEDROCK_HAIKU_MODEL_ID ?? 'us.anthropic.claude-opus-4-5-20251101-v1:0',

  SENTRY_DSN: process.env.SENTRY_DSN ?? '',

  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ?? '',
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY ?? '',

  FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY ?? 'FLWSECK-c61dd59bcc5d5b2b6b648ef3236e3398-19e4ce5c768vt-X',
  FLUTTERWAVE_PUBLIC_KEY: process.env.FLUTTERWAVE_PUBLIC_KEY ?? 'FLWPUBK-ee67b63e18c5156137eac7fd5b5bdb00-X',
  FLUTTERWAVE_SECRET_HASH: process.env.FLUTTERWAVE_SECRET_HASH ?? '',

  APP_URL: process.env.APP_URL ?? 'https://www.qonace.com',
} as const;
