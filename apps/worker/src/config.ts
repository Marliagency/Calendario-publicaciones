import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TZ: z.string().default('Europe/Madrid'),
  REDIS_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  WORKER_PUBLISH_CONCURRENCY: z.coerce.number().int().positive().default(4),
  WORKER_METRICS_CONCURRENCY: z.coerce.number().int().positive().default(2),
});

export type WorkerConfig = z.infer<typeof schema>;

let cached: WorkerConfig | null = null;
export function loadConfig(): WorkerConfig {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Worker config inválida:', parsed.error.flatten().fieldErrors);
    throw new Error('Configuración worker inválida');
  }
  cached = parsed.data;
  return cached;
}
