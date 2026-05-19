import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TZ: z.string().default('Europe/Madrid'),

  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),
  WEB_BASE_URL: z.string().url().default('http://localhost:5173'),

  INGEST_SERVICE_API_KEY: z.string().min(16),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  TOKEN_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'TOKEN_ENCRYPTION_KEY debe ser 64 chars hex (32 bytes)'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  BUDGET_DAILY_CAP_EUR: z.coerce.number().positive().default(5),
  BUDGET_MONTHLY_CAP_EUR: z.coerce.number().positive().default(150),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_OAUTH_REDIRECT_URI: z.string().url().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  TIKTOK_OAUTH_REDIRECT_URI: z.string().url().optional(),
  TIKTOK_WEBHOOK_SECRET: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

let cached: Config | null = null;

export function loadConfig(): Config {
  if (cached) return cached;
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Configuración inválida:', parsed.error.flatten().fieldErrors);
    throw new Error('Configuración inválida — revisa .env contra .env.example');
  }
  cached = parsed.data;
  return cached;
}
