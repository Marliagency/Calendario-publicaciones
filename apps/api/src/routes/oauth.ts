import type { FastifyInstance } from 'fastify';

/**
 * Scaffolding OAuth para Meta (Instagram + Facebook) y TikTok.
 *
 * Sub-fase 1.5: las rutas existen pero responden con stubs porque las apps de
 * Meta/TikTok aún no están creadas (decisión bloqueada en Fase 0). Cuando estén
 * aprobadas, sólo hay que rellenar las llamadas a las APIs reales —el contrato
 * de URLs y cookies ya está definido.
 */
export default async function oauthRoutes(app: FastifyInstance) {
  // ── Meta (IG + FB) ──────────────────────────────────────────────────────
  app.get('/meta/start', async (_req, reply) => {
    reply.code(501);
    return {
      status: 'not_implemented',
      next:
        'Crear Meta Developer App con permisos instagram_content_publish, ' +
        'pages_show_list, pages_read_engagement, pages_manage_posts, ads_management. ' +
        'Cuando estén aprobados, rellenar META_APP_ID/SECRET en .env.',
    };
  });

  app.get('/callback/meta', async () => {
    return { status: 'not_implemented', mock: true };
  });

  // ── TikTok ──────────────────────────────────────────────────────────────
  app.get('/tiktok/start', async (_req, reply) => {
    reply.code(501);
    return {
      status: 'not_implemented',
      next:
        'Crear TikTok for Business app con scopes video.publish, video.upload, ' +
        'user.info.basic, business.creator.insights. Rellenar TIKTOK_CLIENT_KEY/SECRET en .env.',
    };
  });

  app.get('/callback/tiktok', async () => {
    return { status: 'not_implemented', mock: true };
  });
}
