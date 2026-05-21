export const config = {
  PORT: parseInt(process.env.PORT ?? '4000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://qona:qona_dev@localhost:5432/qona_dev',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  SUPABASE_URL: process.env.SUPABASE_URL ?? 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ?? '',

  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ?? '',
  SENTRY_DSN: process.env.SENTRY_DSN ?? '',

  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ?? '',
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY ?? '',

  FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY ?? '',
  FLUTTERWAVE_PUBLIC_KEY: process.env.FLUTTERWAVE_PUBLIC_KEY ?? '',

  APP_URL: process.env.APP_URL ?? 'http://localhost:5173',
} as const;
