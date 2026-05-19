import { ingestPayloadSchema } from '@qyro/shared';
import type { FastifyInstance } from 'fastify';

/**
 * Endpoint de ingest del Estudio Creativo (SESIÓN 2).
 *
 * En sub-fase 1.2 sólo valida el payload contra el schema Zod y responde 202
 * con `external_ref`. La lógica de persistencia + creación de variantes +
 * notificación SSE llega en Fase 2.
 */
export default async function ingestRoutes(app: FastifyInstance) {
  app.post(
    '/content-pieces/ingest',
    { preHandler: [app.requireServiceKey] },
    async (req, reply) => {
      const parsed = ingestPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400);
        return {
          error: 'INVALID_PAYLOAD',
          details: parsed.error.flatten(),
        };
      }
      app.log.info(
        { externalRef: parsed.data.external_ref, format: parsed.data.format },
        'ingest accepted (stub, Fase 1.2)',
      );
      reply.code(202);
      return {
        accepted: true,
        external_ref: parsed.data.external_ref,
        note: 'Fase 2 implementará la persistencia y notificación SSE.',
      };
    },
  );
}
