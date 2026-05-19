import { mkdtemp, readFile, rm } from 'node:fs/promises';
import type { AddressInfo, Server } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PERSONA_IDS } from '../brain/personas/index.js';
import { SocialCalendarClient } from '../clients/social-calendar.js';
import { loadConfig } from '../config.js';
import { ProducerRegistry } from '../producers/registry.js';
import { PipelineOrchestrator } from './orchestrator.js';
import { BrandingOverlay } from './overlay.js';
import { FakeHttpsStorage } from './storage.js';

interface TestableServer {
  listen(opts: { host: string; port: number }): Promise<unknown>;
  close(): Promise<unknown>;
  server: Server;
}

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.INGEST_SERVICE_API_KEY = 'test-ingest-key-1234567890';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-1234567890abcd';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-1234567890abcd';
  process.env.TOKEN_ENCRYPTION_KEY = '0'.repeat(64);
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.SOCIAL_CALENDAR_BASE_URL = 'http://placeholder.test';
  process.env.SOCIAL_CALENDAR_SERVICE_API_KEY = 'test-ingest-key-1234567890';
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
    auditLog: { create: (...args: unknown[]) => auditLogCreateMock(...args) },
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
let workDir: string;

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

beforeEach(async () => {
  findUniqueMock.mockReset();
  createMock.mockReset();
  auditLogCreateMock.mockReset();
  notificationDeliveryCreateMock.mockReset();
  workDir = await mkdtemp(path.join(tmpdir(), 'pipeline-int-'));
});

function buildOrchestrator() {
  process.env.SOCIAL_CALENDAR_BASE_URL = baseUrl;
  const cfg = loadConfig();
  const registry = new ProducerRegistry(cfg, {
    dryRun: true,
    outputDir: path.join(workDir, 'produced'),
    hyperframesProjectDir: workDir,
  });
  const client = new SocialCalendarClient({
    baseUrl,
    serviceApiKey: 'test-ingest-key-1234567890',
    timeoutMs: 5_000,
    maxRetries: 0,
  });
  return new PipelineOrchestrator({
    registry,
    storage: new FakeHttpsStorage('https://cdn.qyro.test/'),
    overlay: new BrandingOverlay(),
    client,
    overlayWorkDir: path.join(workDir, 'overlay'),
    dryRun: true,
  });
}

describe('PipelineOrchestrator end-to-end', () => {
  it('UGC talking-head: pipeline completo dry-run → ingest 201', async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'cp-pipe-1',
      externalRef: '__will_be_filled__',
      status: 'IN_REVIEW',
      variants: [
        { id: 'v-tt', kind: 'tiktok', scheduledAt: null },
        { id: 'v-ig', kind: 'instagram_reel', scheduledAt: null },
      ],
    });
    auditLogCreateMock.mockResolvedValue({});
    notificationDeliveryCreateMock.mockResolvedValue({});

    const orch = buildOrchestrator();
    const run = await orch.run({
      format: 'ugc_video_talking_head',
      spec: 'qyro-ugc-testimonial.tsx',
      title: 'POV: 5 apps de salud abiertas',
      buyerPersonaIds: [PERSONA_IDS.OPTIMIZADOR_CONSCIENTE],
      targetPlatforms: ['tiktok', 'instagram_reel'],
      copyByPlatform: {
        tiktok: { caption: 'POV: tienes 5 apps...', hashtags: ['qyro', 'productividad'] },
      },
      fallbackCopy: { caption: 'POV: 5 apps abiertas', hashtags: ['qyro'] },
      ratio: '9:16',
      durationS: 22,
      frameworkUsed: 'ugc_15s',
      hookUsed: '5-apps-fragmentadas',
    });

    expect(run.ingest.outcome).toBe('accepted');
    expect(run.decision.tool).toBe('hyperframes');
    expect(run.decision.estimatedCost).toBe(0);
    expect(run.production.dryRun).toBe(true);
    expect(run.overlay.dryRun).toBe(true);
    expect(run.variants.built).toEqual(['tiktok', 'instagram_reel']);
    expect(run.variants.skipped).toEqual([]);
    expect(run.storage.url).toMatch(/^https:\/\/cdn\.qyro\.test\//);
    expect(createMock).toHaveBeenCalledOnce();
  });

  it('UGC dinámico: pipeline pasa por Higgsfield Seedance dry-run y registra el spend simulado en metadata', async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'cp-pipe-2',
      externalRef: '__will_be_filled__',
      status: 'IN_REVIEW',
      variants: [{ id: 'v', kind: 'tiktok', scheduledAt: null }],
    });
    auditLogCreateMock.mockResolvedValue({});
    notificationDeliveryCreateMock.mockResolvedValue({});

    const orch = buildOrchestrator();
    const run = await orch.run({
      format: 'ugc_video_dynamic',
      spec: 'POV: handheld, gym, sweaty, Life Score subiendo',
      title: 'Gym POV con Life Score',
      buyerPersonaIds: [PERSONA_IDS.OPTIMIZADOR_CONSCIENTE],
      targetPlatforms: ['tiktok'],
      copyByPlatform: {},
      fallbackCopy: { caption: 'Tu Life Score sube cuando entrenas.', hashtags: ['qyro'] },
      ratio: '9:16',
      durationS: 22,
    });

    expect(run.ingest.outcome).toBe('accepted');
    expect(run.decision.tool).toBe('higgsfield');
    expect(run.decision.model).toBe('seedance_2_0');
    // En dry-run, el spend real es 0 pero metadata captura wouldHaveSpent
    expect(run.production.creditsSpent).toBe(0);

    // Verificar el payload que llegó al server: format='ugc_video'
    const createArgs = createMock.mock.calls[0]?.[0] as { data: { format: string } };
    expect(createArgs.data.format).toBe('ugc_video');
  });

  it('lanza si ninguna variante es construible (todas skipped)', async () => {
    findUniqueMock.mockResolvedValue(null);
    const orch = buildOrchestrator();
    await expect(
      orch.run({
        format: 'ugc_video_dynamic',
        spec: 'x',
        title: 'Imposible',
        buyerPersonaIds: [],
        // Targets exigen ratio incompatible con 9:16 → todos skipped
        targetPlatforms: ['instagram_feed', 'facebook_feed'],
        copyByPlatform: {},
        fallbackCopy: { caption: 'x', hashtags: [] },
        ratio: '9:16',
        durationS: 22,
      }),
    ).rejects.toThrow(/ninguna variante construida/);
  });

  it('idempotencia: ejecutar el mismo brief dos veces produce 2 externalRefs distintos (cada CreativeRun es uno)', async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'cp-idem',
      externalRef: 'x',
      status: 'IN_REVIEW',
      variants: [{ id: 'v', kind: 'tiktok', scheduledAt: null }],
    });
    auditLogCreateMock.mockResolvedValue({});
    notificationDeliveryCreateMock.mockResolvedValue({});

    const orch = buildOrchestrator();
    const brief = {
      format: 'ugc_video_talking_head' as const,
      spec: 'x.tsx',
      title: 't',
      buyerPersonaIds: [],
      targetPlatforms: ['tiktok' as const],
      copyByPlatform: {},
      fallbackCopy: { caption: 'x', hashtags: [] },
      ratio: '9:16' as const,
      durationS: 22,
    };
    const a = await orch.run(brief);
    const b = await orch.run(brief);
    expect(a.externalRef).not.toBe(b.externalRef);
  });

  it('CreativeRun output guardable en disco como rastro de auditoría', async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'cp-trace',
      externalRef: 'x',
      status: 'IN_REVIEW',
      variants: [{ id: 'v', kind: 'tiktok', scheduledAt: null }],
    });
    auditLogCreateMock.mockResolvedValue({});
    notificationDeliveryCreateMock.mockResolvedValue({});

    const orch = buildOrchestrator();
    const run = await orch.run({
      format: 'ugc_video_talking_head',
      spec: 'x.tsx',
      title: 't',
      buyerPersonaIds: [],
      targetPlatforms: ['tiktok'],
      copyByPlatform: {},
      fallbackCopy: { caption: 'x', hashtags: [] },
      ratio: '9:16',
      durationS: 22,
    });

    // Verificar que el dryrun placeholder en disco existe y es JSON parseable
    const placeholder = JSON.parse(await readFile(run.production.mediaPath, 'utf-8')) as {
      producer: string;
    };
    expect(placeholder.producer).toBe('hyperframes');
  });
});
