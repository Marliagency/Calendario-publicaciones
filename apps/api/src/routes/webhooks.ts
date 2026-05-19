import { type Platform, prisma } from '@qyro/db';
import { getPublisher } from '@qyro/platform-adapters';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';

/**
 * Webhooks entrantes de Meta y TikTok.
 *
 * Verifica HMAC antes de procesar. Marca PlatformVariant.publishedAt al
 * recibir confirmación de publicación. Es complementario al worker (que ya
 * publica vía API y marca publishedAt) — sirve para confirmar/sincronizar
 * eventos posteriores (comentarios, completion).
 *
 * Nota: usamos JSON.stringify(body) como aproximación del raw body para HMAC.
 * Para Meta/TikTok reales hay que registrar un contentTypeParser que conserve
 * el buffer exacto recibido (el orden de keys importa para la firma).
 */
export default async function webhooksRoutes(app: FastifyInstance) {
  const config = loadConfig();

  app.get('/meta', async (req, reply) => {
    const q = req.query as {
      'hub.mode'?: string;
      'hub.verify_token'?: string;
      'hub.challenge'?: string;
    };
    if (
      q['hub.mode'] === 'subscribe' &&
      q['hub.verify_token'] === config.META_WEBHOOK_VERIFY_TOKEN
    ) {
      reply.code(200).type('text/plain');
      return q['hub.challenge'] ?? '';
    }
    reply.code(403);
    return { error: 'INVALID_VERIFY_TOKEN' };
  });

  app.post('/meta', async (req, reply) => {
    const sig = req.headers['x-hub-signature-256'];
    const secret = config.META_APP_SECRET ?? config.META_WEBHOOK_VERIFY_TOKEN ?? '';
    const raw = JSON.stringify(req.body ?? {});
    const ok = getPublisher('instagram_reel').verifyWebhookSignature({
      rawBody: raw,
      signatureHeader: Array.isArray(sig) ? sig[0] : sig,
      secret,
    });
    if (!ok) {
      app.log.warn('meta webhook con firma inválida');
      reply.code(401);
      return { error: 'INVALID_SIGNATURE' };
    }
    await handleWebhook('instagram', req.body, app);
    return { ok: true };
  });

  app.post('/tiktok', async (req, reply) => {
    const sig = req.headers['tiktok-signature'];
    const secret = config.TIKTOK_WEBHOOK_SECRET ?? '';
    const raw = JSON.stringify(req.body ?? {});
    const ok = getPublisher('tiktok').verifyWebhookSignature({
      rawBody: raw,
      signatureHeader: Array.isArray(sig) ? sig[0] : sig,
      secret,
    });
    if (!ok) {
      app.log.warn('tiktok webhook con firma inválida');
      reply.code(401);
      return { error: 'INVALID_SIGNATURE' };
    }
    await handleWebhook('tiktok', req.body, app);
    return { ok: true };
  });
}

interface WebhookPayload {
  platformPostId?: string;
  event?: string;
}

async function handleWebhook(
  _platform: Platform,
  body: unknown,
  app: FastifyInstance,
): Promise<void> {
  const payload = body as WebhookPayload | undefined;
  if (!payload?.platformPostId) return;
  const variant = await prisma.platformVariant.findFirst({
    where: { platformPostId: payload.platformPostId },
  });
  if (!variant) {
    app.log.info({ platformPostId: payload.platformPostId }, 'webhook para post desconocido');
    return;
  }
  if (!variant.publishedAt) {
    await prisma.platformVariant.update({
      where: { id: variant.id },
      data: { publishedAt: new Date() },
    });
  }
}
