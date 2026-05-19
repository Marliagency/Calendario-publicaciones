/**
 * Mock backend para desarrollo offline (sin Postgres ni Redis).
 *
 * Solo se activa cuando `VITE_MOCK_API=1`. En `api.ts`, `api()` consulta
 * `tryMockApi(path, init)` ANTES de hacer fetch; si devuelve un valor,
 * salta la red por completo. Las respuestas conservan el shape exacto
 * que devuelven las rutas reales en `apps/api/src/routes/*`.
 */
import type { ContentPiece } from '../api/contentPieces.js';

const today = new Date();
const isoFromHourOffset = (dayOffset: number, hour: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const mockPieces: ContentPiece[] = [
  {
    id: 'mock-piece-1',
    externalRef: null,
    title: 'POV: 5 apps de salud y ninguna te dice si vas bien',
    format: 'SHORT_VIDEO',
    status: 'IN_REVIEW',
    hookUsed: 'POV',
    frameworkUsed: 'PROBLEM_SOLUTION',
    qcChecklistJson: null,
    boostBudgetEur: null,
    createdAt: isoFromHourOffset(-1, 10),
    updatedAt: isoFromHourOffset(-1, 10),
    variants: [
      {
        id: 'mock-variant-1a',
        kind: 'tiktok',
        mediaUrl: 'https://placehold.co/720x1280/3B82F6/FFFFFF?text=TikTok',
        mediaType: 'video',
        ratio: '9:16',
        durationS: 22,
        caption: 'POV: 5 apps de salud abiertas y ninguna te dice si vas bien. QYRO las sustituye todas.',
        hashtags: ['#qyro', '#salud', '#hábitos'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(1, 19),
        publishedAt: null,
      },
      {
        id: 'mock-variant-1b',
        kind: 'instagram_reel',
        mediaUrl: 'https://placehold.co/720x1280/7C5CFC/FFFFFF?text=IG+Reel',
        mediaType: 'video',
        ratio: '9:16',
        durationS: 22,
        caption: 'POV: 5 apps de salud y ninguna te dice si vas bien.',
        hashtags: ['#qyro', '#wellness'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(1, 20),
        publishedAt: null,
      },
    ],
    buyerPersonas: [
      { buyerPersona: { id: 'persona-01-optimizador-consciente', name: 'El Optimizador Consciente' } },
    ],
    campaign: { id: 'campaign-demo', name: 'Lanzamiento Q3 2026' },
  },
  {
    id: 'mock-piece-2',
    externalRef: null,
    title: 'Habitica, MyFitnessPal, Strong, Notion — esto las sustituye todas',
    format: 'CAROUSEL',
    status: 'SCHEDULED',
    hookUsed: 'LIST',
    frameworkUsed: 'BEFORE_AFTER',
    qcChecklistJson: null,
    boostBudgetEur: null,
    createdAt: isoFromHourOffset(-2, 9),
    updatedAt: isoFromHourOffset(-2, 9),
    variants: [
      {
        id: 'mock-variant-2a',
        kind: 'instagram_feed',
        mediaUrl: 'https://placehold.co/1080x1080/22C55E/FFFFFF?text=Carousel',
        mediaType: 'carousel',
        ratio: '1:1',
        durationS: null,
        caption: 'Habitica, MyFitnessPal, Strong, Notion — esto las sustituye todas.',
        hashtags: ['#qyro', '#productividad'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(2, 12),
        publishedAt: null,
      },
    ],
    buyerPersonas: [
      { buyerPersona: { id: 'persona-02-persona-transicion', name: 'La Persona en Transición' } },
    ],
    campaign: { id: 'campaign-demo', name: 'Lanzamiento Q3 2026' },
  },
  {
    id: 'mock-piece-3',
    externalRef: null,
    title: 'Antes vs después de 30 días con QYRO',
    format: 'SHORT_VIDEO',
    status: 'PUBLISHED',
    hookUsed: 'TRANSFORMATION',
    frameworkUsed: 'BEFORE_AFTER',
    qcChecklistJson: null,
    boostBudgetEur: null,
    createdAt: isoFromHourOffset(-5, 9),
    updatedAt: isoFromHourOffset(-1, 9),
    variants: [
      {
        id: 'mock-variant-3a',
        kind: 'instagram_reel',
        mediaUrl: 'https://placehold.co/720x1280/0B1220/FFFFFF?text=Reel',
        mediaType: 'video',
        ratio: '9:16',
        durationS: 30,
        caption: 'Antes vs después de 30 días con QYRO.',
        hashtags: ['#qyro', '#transformación'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(-1, 19),
        publishedAt: isoFromHourOffset(-1, 19),
      },
    ],
    buyerPersonas: [
      { buyerPersona: { id: 'persona-01-optimizador-consciente', name: 'El Optimizador Consciente' } },
    ],
    campaign: { id: 'campaign-demo', name: 'Lanzamiento Q3 2026' },
  },
];

const mockDashboard = {
  total: 3,
  byStatus: { IN_REVIEW: 1, SCHEDULED: 1, PUBLISHED: 1 },
  approvalRate: 0.67,
  avgReviewMin: 14,
  failedRate: 0,
  holdRate: 0.72,
  topPosts: [{ id: 'mock-piece-3', title: 'Antes vs después de 30 días con QYRO', engagement: 1284 }],
};

const mockSpendSummary = {
  allowed: true,
  daily: { committedEur: 1.5, spentEur: 0.5, capEur: 5 },
  monthly: { committedEur: 12.4, spentEur: 8.2, capEur: 150 },
};

const mockAudiencePresets = {
  items: [
    {
      id: 'preset-optimizador',
      name: 'Optimizador Consciente — ES/MX/AR',
      geo: ['ES', 'MX', 'AR', 'CO', 'CL'],
      ageMin: 22,
      ageMax: 38,
      placementsRecommended: ['reels', 'tiktok_feed'],
    },
    {
      id: 'preset-transicion',
      name: 'Persona en Transición — ES/MX',
      geo: ['ES', 'MX', 'AR'],
      ageMin: 28,
      ageMax: 45,
      placementsRecommended: ['reels', 'feed'],
    },
  ],
};

const mockMe = {
  user: { sub: 'mock-user-1', email: 'diego@qyro.app', isAdmin: true },
};

const mockUnreadCount = { in_review: 1, unread_deliveries: 0 };

const mockQcRun = { automatic: [], manual: [] };

export function isMockApiEnabled(): boolean {
  return import.meta.env.VITE_MOCK_API === '1';
}

export function tryMockApi<T>(path: string, init: RequestInit): T | undefined {
  if (!isMockApiEnabled()) return undefined;
  const method = (init.method ?? 'GET').toUpperCase();
  const url = new URL(path, 'http://mock.local');
  const p = url.pathname;

  if (p === '/api/v1/auth/me' && method === 'GET') return mockMe as T;
  if (p === '/api/v1/notifications/unread-count') return mockUnreadCount as T;
  if (p === '/api/v1/dashboard') return mockDashboard as T;
  if (p === '/api/v1/audience-presets') return { items: mockAudiencePresets.items } as T;
  if (p === '/api/v1/boost/spend-summary') return mockSpendSummary as T;

  if (p === '/api/v1/content-pieces' && method === 'GET') {
    const statusParam = url.searchParams.get('status');
    const items = statusParam
      ? mockPieces.filter((pc) => statusParam.split(',').includes(pc.status))
      : mockPieces;
    return { items } as T;
  }

  const detailMatch = p.match(/^\/api\/v1\/content-pieces\/([^/]+)$/);
  if (detailMatch && method === 'GET') {
    const piece = mockPieces.find((pc) => pc.id === detailMatch[1]);
    if (piece) return { piece: { ...piece, auditLogs: [] } } as T;
  }

  if (p.endsWith('/qc-run') && method === 'POST') return mockQcRun as T;

  // Mutaciones: no-op exitoso (la UI invalida queries y refetch devolverá el mock).
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
    return {} as T;
  }

  return undefined;
}
