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
    format: 'ugc_video',
    status: 'IN_REVIEW',
    hookUsed: 'pov-5-apps-fragmentadas',
    frameworkUsed: 'ugc_15s',
    qcChecklistJson: null,
    boostBudgetEur: null,
    createdAt: isoFromHourOffset(-1, 10),
    updatedAt: isoFromHourOffset(-1, 10),
    variants: [
      {
        id: 'mock-variant-1a',
        kind: 'tiktok',
        mediaUrl: '/mock-creatives/tt-pov-5-apps-9x16.svg',
        mediaType: 'image',
        ratio: '9:16',
        durationS: 22,
        caption:
          'POV: 5 apps de salud abiertas y ninguna te dice si vas bien. QYRO las sustituye todas.',
        hashtags: ['#qyro', '#productividad', '#habitos', '#atomichabits'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(1, 19),
        publishedAt: null,
      },
      {
        id: 'mock-variant-1b',
        kind: 'instagram_reel',
        mediaUrl: '/mock-creatives/tt-pov-5-apps-9x16.svg',
        mediaType: 'image',
        ratio: '9:16',
        durationS: 22,
        caption: 'POV: 5 apps de salud y ninguna te dice si vas bien.',
        hashtags: ['#qyro', '#selfimprovement'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(1, 20),
        publishedAt: null,
      },
    ],
    buyerPersonas: [
      {
        buyerPersona: {
          id: 'persona-01-optimizador-consciente',
          name: 'El Optimizador Consciente',
        },
      },
    ],
    campaign: { id: 'campaign-demo', name: 'Lanzamiento Q3 2026' },
  },
  {
    id: 'mock-piece-2',
    externalRef: null,
    title: 'Habitica, MyFitnessPal, Strong, Notion — esto las sustituye todas',
    format: 'image',
    status: 'IN_REVIEW',
    hookUsed: 'sustituye-stack-completo',
    frameworkUsed: 'list_4_to_1',
    qcChecklistJson: null,
    boostBudgetEur: null,
    createdAt: isoFromHourOffset(-2, 9),
    updatedAt: isoFromHourOffset(-2, 9),
    variants: [
      {
        id: 'mock-variant-2a',
        kind: 'instagram_feed',
        mediaUrl: '/mock-creatives/ig-feed-sustituye-todas-1x1.svg',
        mediaType: 'image',
        ratio: '1:1',
        durationS: null,
        caption: 'Habitica, MyFitnessPal, Strong, Notion — esto las sustituye todas.',
        hashtags: ['#qyro', '#productividad', '#minimalismo'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(2, 12),
        publishedAt: null,
      },
    ],
    buyerPersonas: [
      {
        buyerPersona: {
          id: 'persona-01-optimizador-consciente',
          name: 'El Optimizador Consciente',
        },
      },
    ],
    campaign: { id: 'campaign-demo', name: 'Lanzamiento Q3 2026' },
  },
  {
    id: 'mock-piece-3',
    externalRef: null,
    title: 'Antes vs después de 30 días con QYRO',
    format: 'ugc_video',
    status: 'PUBLISHED',
    hookUsed: 'life-score-40-puntos',
    frameworkUsed: 'before_after',
    qcChecklistJson: null,
    boostBudgetEur: null,
    createdAt: isoFromHourOffset(-5, 9),
    updatedAt: isoFromHourOffset(-1, 9),
    variants: [
      {
        id: 'mock-variant-3a',
        kind: 'instagram_reel',
        mediaUrl: '/mock-creatives/ig-reel-transformacion-9x16.svg',
        mediaType: 'image',
        ratio: '9:16',
        durationS: 30,
        caption: 'Antes vs después de 30 días con QYRO. +45 puntos de Life Score.',
        hashtags: ['#qyro', '#transformacion', '#habitos'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(-1, 19),
        publishedAt: isoFromHourOffset(-1, 19),
      },
    ],
    buyerPersonas: [
      {
        buyerPersona: {
          id: 'persona-01-optimizador-consciente',
          name: 'El Optimizador Consciente',
        },
      },
    ],
    campaign: { id: 'campaign-demo', name: 'Lanzamiento Q3 2026' },
  },
  {
    id: 'mock-piece-4',
    externalRef: null,
    title: 'Mi Life Score subió 40 puntos en 3 semanas',
    format: 'app_demo',
    status: 'APPROVED',
    hookUsed: 'life-score-40-puntos',
    frameworkUsed: 'app_demo_canonical',
    qcChecklistJson: null,
    boostBudgetEur: null,
    createdAt: isoFromHourOffset(-1, 14),
    updatedAt: isoFromHourOffset(0, 9),
    variants: [
      {
        id: 'mock-variant-4a',
        kind: 'tiktok',
        mediaUrl: '/mock-creatives/ig-reel-life-score-9x16.svg',
        mediaType: 'image',
        ratio: '9:16',
        durationS: 25,
        caption:
          'De 30 a 70 de Life Score en 3 semanas. Estas son las 3 cosas que cambiaron.',
        hashtags: ['#qyro', '#productividad', '#lifescore'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(2, 18),
        publishedAt: null,
      },
      {
        id: 'mock-variant-4b',
        kind: 'instagram_reel',
        mediaUrl: '/mock-creatives/ig-reel-life-score-9x16.svg',
        mediaType: 'image',
        ratio: '9:16',
        durationS: 25,
        caption: 'Mi Life Score subió 40 puntos en 3 semanas. Esto fue lo que cambió.',
        hashtags: ['#qyro', '#habitos', '#selfimprovement'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(2, 19),
        publishedAt: null,
      },
    ],
    buyerPersonas: [
      {
        buyerPersona: {
          id: 'persona-01-optimizador-consciente',
          name: 'El Optimizador Consciente',
        },
      },
    ],
    campaign: { id: 'campaign-demo', name: 'Lanzamiento Q3 2026' },
  },
  {
    id: 'mock-piece-5',
    externalRef: null,
    title: 'Foto al plato. IA que cuenta las calorías.',
    format: 'ugc_video',
    status: 'IN_REVIEW',
    hookUsed: 'foto-al-plato',
    frameworkUsed: 'feature_demo',
    qcChecklistJson: null,
    boostBudgetEur: null,
    createdAt: isoFromHourOffset(0, 8),
    updatedAt: isoFromHourOffset(0, 8),
    variants: [
      {
        id: 'mock-variant-5a',
        kind: 'tiktok',
        mediaUrl: '/mock-creatives/tt-foto-macros-9x16.svg',
        mediaType: 'image',
        ratio: '9:16',
        durationS: 18,
        caption:
          'Sin contar calorías a mano. Foto al plato y listo. La IA te dice qué comiste.',
        hashtags: ['#qyro', '#nutricion', '#perdergrasa'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(3, 21),
        publishedAt: null,
      },
      {
        id: 'mock-variant-5b',
        kind: 'instagram_reel',
        mediaUrl: '/mock-creatives/tt-foto-macros-9x16.svg',
        mediaType: 'image',
        ratio: '9:16',
        durationS: 18,
        caption: 'Foto al plato. IA que cuenta las calorías. Así de fácil con QYRO.',
        hashtags: ['#qyro', '#nutricion', '#alimentacionconsciente'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(3, 19),
        publishedAt: null,
      },
    ],
    buyerPersonas: [
      {
        buyerPersona: {
          id: 'persona-02-en-transicion',
          name: 'La Persona en Transición',
        },
      },
    ],
    campaign: { id: 'campaign-demo', name: 'Lanzamiento Q3 2026' },
  },
  {
    id: 'mock-piece-6',
    externalRef: null,
    title: 'Llevo 47 días de racha. Antes no llegaba a 5.',
    format: 'ugc_video',
    status: 'SCHEDULED',
    hookUsed: 'streak-47-dias',
    frameworkUsed: 'personal_proof',
    qcChecklistJson: null,
    boostBudgetEur: null,
    createdAt: isoFromHourOffset(-3, 10),
    updatedAt: isoFromHourOffset(-1, 16),
    variants: [
      {
        id: 'mock-variant-6a',
        kind: 'tiktok',
        mediaUrl: '/mock-creatives/tt-streak-47-9x16.svg',
        mediaType: 'image',
        ratio: '9:16',
        durationS: 15,
        caption: 'Llevo 47 días de racha. Antes no llegaba a 5. Esta es la diferencia.',
        hashtags: ['#qyro', '#habitos', '#streak', '#atomichabits'],
        firstComment: null,
        scheduledAt: isoFromHourOffset(1, 7),
        publishedAt: null,
      },
    ],
    buyerPersonas: [
      {
        buyerPersona: {
          id: 'persona-01-optimizador-consciente',
          name: 'El Optimizador Consciente',
        },
      },
    ],
    campaign: { id: 'campaign-demo', name: 'Lanzamiento Q3 2026' },
  },
];

const mockDashboard = {
  total: 6,
  byStatus: { IN_REVIEW: 3, APPROVED: 1, SCHEDULED: 1, PUBLISHED: 1 },
  approvalRate: 0.83,
  avgReviewMin: 12,
  failedRate: 0,
  holdRate: 0.72,
  topPosts: [
    { id: 'mock-piece-3', title: 'Antes vs después de 30 días con QYRO', engagement: 1284 },
  ],
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

const mockUnreadCount = { in_review: 3, unread_deliveries: 2 };

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
