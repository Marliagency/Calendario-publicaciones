import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.INGEST_SERVICE_API_KEY = 'test-ingest-key-1234567890';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-1234567890abcd';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-1234567890abcd';
  process.env.TOKEN_ENCRYPTION_KEY = '0'.repeat(64);
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
});

describe('config', () => {
  it('carga con variables válidas', async () => {
    const { loadConfig } = await import('./config.js');
    const cfg = loadConfig();
    expect(cfg.BUDGET_DAILY_CAP_EUR).toBe(5);
    expect(cfg.BUDGET_MONTHLY_CAP_EUR).toBe(150);
    expect(cfg.TZ).toBe('Europe/Madrid');
  });
});

describe('ingest payload validation', () => {
  it('rechaza payload con external_ref inválido', async () => {
    const { ingestPayloadSchema } = await import('@qyro/shared');
    const res = ingestPayloadSchema.safeParse({
      external_ref: 'not-a-uuid',
      title: 'x',
      format: 'reel',
      platform_variants: {},
    });
    expect(res.success).toBe(false);
  });

  it('acepta payload mínimo válido', async () => {
    const { ingestPayloadSchema } = await import('@qyro/shared');
    const res = ingestPayloadSchema.safeParse({
      external_ref: '11111111-1111-4111-8111-111111111111',
      title: 'Demo',
      format: 'reel',
      platform_variants: {
        tiktok: {
          media_url: 'https://example.com/video.mp4',
          ratio: '9:16',
          duration_s: 22,
          caption: 'hola',
          hashtags: ['#qyro'],
        },
      },
    });
    expect(res.success).toBe(true);
  });
});
