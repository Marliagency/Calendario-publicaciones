import type { AddressInfo, Server } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialCalendarClient } from './social-calendar.js';

interface TestableServer {
  listen(opts: { host: string; port: number }): Promise<unknown>;
  close(): Promise<unknown>;
  server: Server;
}

/**
 * Integration test: arranca el servidor REAL del calendario
 * (`@qyro/api/server`) en un puerto aleatorio, mockea Prisma (la única
 * dependencia que requiere infra externa) y verifica que el cliente
 * del Estudio hace round-trip completo vía fetch real.
 *
 * Esto cierra el bucle "el contrato funciona end-to-end" sin necesidad
 * de Docker — la única razón por la que el smoke test del CLI no se
 * puede ejecutar sin infra es la DB real.
 */

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.INGEST_SERVICE_API_KEY = 'test-ingest-key-1234567890';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-1234567890abcd';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-1234567890abcd';
  process.env.TOKEN_ENCRYPTION_KEY = '0'.repeat(64);
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
});

const findUniqueMock = vi.fn();
const createMock = vi.fn();
const auditLogCreateMock = vi.fn();
const notificationDeliveryCreateMock = vi.fn();

vi.mock('@qyro/db', () => ({
  prisma: {
    contentPiece: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => auditLogCreateMock(...args),
    },
    notificationDelivery: {
      create: (...args: unknown[]) => notificationDeliveryCreateMock(...args),
    },
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        contentPiece: { create: (...args: unknown[]) => createMock(...args) },
        auditLog: { create: (...args: unknown[]) => auditLogCreateMock(...args) },
      }),
  },
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      constructor(
        msg: string,
        public code: string,
      ) {
        super(msg);
      }
    },
  },
}));

let app: TestableServer;
let baseUrl: string;

beforeAll(async () => {
  const { buildServer } = (await import('@qyro/api/server')) as {
    buildServer: () => Promise<TestableServer>;
  };
  app = await buildServer();
  await app.listen({ host: '127.0.0.1', port: 0 });
  const addr = app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  if (app) await app.close();
});

beforeEach(() => {
  findUniqueMock.mockReset();
  createMock.mockReset();
  auditLogCreateMock.mockReset();
  notificationDeliveryCreateMock.mockReset();
});

function makeClient() {
  return new SocialCalendarClient({
    baseUrl,
    serviceApiKey: 'test-ingest-key-1234567890',
    timeoutMs: 5_000,
    maxRetries: 0,
  });
}

describe('SocialCalendarClient ↔ @qyro/api integration', () => {
  it('round-trip 201: cliente envía → server persiste → cliente recibe accepted', async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'cp-int-1',
      externalRef: '22222222-2222-4222-8222-222222222222',
      status: 'IN_REVIEW',
      variants: [{ id: 'v-1', kind: 'tiktok', scheduledAt: null }],
    });
    auditLogCreateMock.mockResolvedValue({});
    notificationDeliveryCreateMock.mockResolvedValue({});

    const res = await makeClient().ingest({
      external_ref: '22222222-2222-4222-8222-222222222222',
      title: 'Integration round-trip',
      format: 'ugc_video',
      buyer_persona_ids: ['persona-01-optimizador-consciente'],
      platform_variants: {
        tiktok: {
          media_url: 'https://example.com/v.mp4',
          ratio: '9:16',
          duration_s: 22,
          caption: 'Hola',
          hashtags: ['qyro'],
        },
      },
    });

    expect(res.outcome).toBe('accepted');
    if (res.outcome === 'accepted') {
      expect(res.contentPieceId).toBe('cp-int-1');
      expect(res.status).toBe('IN_REVIEW');
      expect(res.variants).toHaveLength(1);
    }
    expect(createMock).toHaveBeenCalledOnce();
    expect(auditLogCreateMock).toHaveBeenCalledOnce();
  });

  it('round-trip 200 duplicated: segundo ingest con mismo external_ref no duplica', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'cp-existing',
      externalRef: '33333333-3333-4333-8333-333333333333',
      status: 'APPROVED',
      variants: [],
    });

    const res = await makeClient().ingest({
      external_ref: '33333333-3333-4333-8333-333333333333',
      title: 'Dup',
      format: 'reel',
      buyer_persona_ids: [],
      platform_variants: {
        tiktok: {
          media_url: 'https://example.com/v.mp4',
          ratio: '9:16',
          duration_s: 20,
          hashtags: [],
        },
      },
    });

    expect(res.outcome).toBe('duplicated');
    if (res.outcome === 'duplicated') {
      expect(res.contentPieceId).toBe('cp-existing');
      expect(res.status).toBe('APPROVED');
    }
    expect(createMock).not.toHaveBeenCalled();
  });

  it('round-trip 400: server devuelve VALIDATION_FAILED y cliente mapea a rejected', async () => {
    findUniqueMock.mockResolvedValue(null);

    const res = await makeClient().ingest({
      external_ref: '44444444-4444-4444-8444-444444444444',
      title: 'Bad ratio',
      format: 'reel',
      buyer_persona_ids: [],
      platform_variants: {
        tiktok: {
          media_url: 'https://example.com/v.mp4',
          ratio: '1:1', // TikTok solo acepta 9:16
          duration_s: 20,
          hashtags: [],
        },
      },
    });

    expect(res.outcome).toBe('rejected');
    if (res.outcome === 'rejected') {
      expect(res.error).toBe('VALIDATION_FAILED');
      expect(res.blockers.some((b) => b.code === 'INVALID_RATIO')).toBe(true);
    }
    expect(createMock).not.toHaveBeenCalled();
  });

  it('healthcheck contra server real devuelve ok+reachable', async () => {
    const h = await makeClient().healthcheck();
    expect(h.reachable).toBe(true);
    expect(h.ok).toBe(true);
  });
});
