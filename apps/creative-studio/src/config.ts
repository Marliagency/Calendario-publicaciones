import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.string().default('info'),

  SOCIAL_CALENDAR_BASE_URL: z.string().url(),
  SOCIAL_CALENDAR_SERVICE_API_KEY: z.string().min(16),
  SOCIAL_CALENDAR_TIMEOUT_S: z.coerce.number().int().positive().default(10),
  SOCIAL_CALENDAR_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),

  STUDIO_DRY_RUN: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),

  HIGGSFIELD_API_KEY: z.string().optional(),
  /** ID + Secret pair (formato actual de la API HTTP de Higgsfield). */
  HIGGSFIELD_API_ID: z.string().uuid().optional(),
  HIGGSFIELD_API_SECRET: z.string().min(32).optional(),
  /** Base URL del API HTTP de Higgsfield. Override para tests/sandbox. */
  HIGGSFIELD_API_BASE_URL: z.string().url().default('https://platform.higgsfield.ai'),
  HIGGSFIELD_MONTHLY_CREDIT_BUDGET: z.coerce.number().int().positive().default(2000),
  HIGGSFIELD_SOFT_WARN_AT_PCT: z.coerce.number().int().min(0).max(100).default(70),
  HIGGSFIELD_HARD_BLOCK_AT_PCT: z.coerce.number().int().min(0).max(100).default(95),
  HIGGSFIELD_PREMIUM_MODELS: z
    .string()
    .default('veo_3_1,sora_2,kling_3_0_premium')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    throw new Error(`Config inválida: ${JSON.stringify(flat.fieldErrors)}`);
  }
  return parsed.data;
}
