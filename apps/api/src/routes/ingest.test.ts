import type { IngestPayload } from '@qyro/shared';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.INGEST_SERVICE_API_KEY = 'test-ingest-key-123456';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-1234567890abcd';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-1234567890abcd';
  process.env.TOKEN_ENCRYPTION_KEY = '0'.repeat(64);
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
});

const findUniqueMock = vi.fn();
const createMock = vi.fn();
const transactionMock = vi.fn();
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
      transactionMock(fn) ??
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

function validPayload(overrides: Partial<IngestPayload> = {}): IngestPayload {
  return {
    external_ref: '11111111-1111-4111-8111-111111111111',
    title: 'Demo ingest',
    format: 'reel',
    buyer_persona_ids: ['persona-01-optimizador-consciente'],
    platform_variants: {
      tiktok: {
        media_url: 'https://example.com/v.mp4',
        ratio: '9:16',
        duration_s: 22,
        caption: 'Hola',
        hashtags: ['#qyro'],
      },
    },
    ...overrides,
  };
}

async function buildApp() {
  const { buildServer } = await import('../server.js');
  return buildServer();
}

beforeEach(() => {
  findUniqueMock.mockReset();
  createMock.mockReset();
  auditLogCreateMock.mockReset();
  notificationDeliveryCreateMock.mockReset();
  transactionMock.mockReset();
});

describe('POST /api/v1/content-pieces/ingest', () => {
  it('rechaza si falta API key', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content-pieces/ingest',
      payload: validPayload(),
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('acepta payload válido y devuelve 201 con content_piece_id', async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'cp-1',
      externalRef: '11111111-1111-4111-8111-111111111111',
      status: 'IN_REVIEW',
      variants: [{ id: 'v-1', kind: 'tiktok', scheduledAt: null }],
    });
    auditLogCreateMock.mockResolvedValue({});
    notificationDeliveryCreateMock.mockResolvedValue({});

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content-pieces/ingest',
      headers: { 'x-service-api-key': 'test-ingest-key-123456' },
      payload: validPayload(),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.accepted).toBe(true);
    expect(body.content_piece_id).toBe('cp-1');
    expect(body.status).toBe('IN_REVIEW');
    await app.close();
  });

  it('devuelve 400 con blockers si el payload viola límites de plataforma', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content-pieces/ingest',
      headers: { 'x-service-api-key': 'test-ingest-key-123456' },
      payload: validPayload({
        platform_variants: {
          tiktok: {
            media_url: 'https://x/v.mp4',
            ratio: '1:1', // inválido
            duration_s: 22,
            hashtags: [],
          },
        },
      }),
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('VALIDATION_FAILED');
    expect(body.blockers.some((b: { code: string }) => b.code === 'INVALID_RATIO')).toBe(true);
    await app.close();
  });

  it('es idempotente: si external_ref existe devuelve 200 sin duplicar', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'cp-existing',
      externalRef: '11111111-1111-4111-8111-111111111111',
      status: 'APPROVED',
      variants: [],
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content-pieces/ingest',
      headers: { 'x-service-api-key': 'test-ingest-key-123456' },
      payload: validPayload(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.duplicated).toBe(true);
    expect(body.content_piece_id).toBe('cp-existing');
    expect(body.status).toBe('APPROVED');
    expect(createMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('rechaza con 400 si Zod falla (external_ref no UUID)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content-pieces/ingest',
      headers: { 'x-service-api-key': 'test-ingest-key-123456' },
      payload: { ...validPayload(), external_ref: 'not-a-uuid' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('INVALID_PAYLOAD');
    await app.close();
  });
});
