import { Prisma } from '@qyro/db';
import { ingestPayloadSchema } from '@qyro/shared';
import type { FastifyInstance } from 'fastify';
import { persistIngest } from '../ingest/persist.js';
import { hasBlockers, validateIngestPayload } from '../ingest/validate.js';

/**
 * Endpoint de ingest del Estudio Creativo (SESIÓN 2).
 *
 * Flujo:
 *   1. Auth service-to-service vía X-Service-API-Key.
 *   2. Valida payload contra schema Zod.
 *   3. Valida cruzado contra límites de cada plataforma (ratio, duración,
 *      hashtags, caption length).
 *   4. Si hay BLOCKERS → 400 con detalle.
 *   5. Persiste atómicamente (ContentPiece + N PlatformVariants + AuditLog).
 *   6. Idempotente por external_ref: si ya existe devuelve la misma pieza con
 *      duplicated: true y status actual.
 *   7. Emite evento SSE `content-piece.ingested` y persiste en NotificationDelivery.
 */
export default async function ingestRoutes(app: FastifyInstance) {
  app.post(
    '/content-pieces/ingest',
    { preHandler: [app.requireServiceKey] },
    async (req, reply) => {
      const parsed = ingestPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: 'INVALID_PAYLOAD', details: parsed.error.flatten() };
      }

      const payload = parsed.data;
      const issues = validateIngestPayload(payload);

      if (hasBlockers(issues)) {
        app.log.warn(
          {
            externalRef: payload.external_ref,
            issues: issues.filter((i) => i.severity === 'blocker'),
          },
          'ingest rechazado por validación',
        );
        reply.code(400);
        return {
          error: 'VALIDATION_FAILED',
          external_ref: payload.external_ref,
          blockers: issues.filter((i) => i.severity === 'blocker'),
          warnings: issues.filter((i) => i.severity === 'warning'),
        };
      }

      try {
        const { contentPiece, duplicated } = await persistIngest(
          payload,
          issues.filter((i) => i.severity === 'warning'),
        );

        if (duplicated) {
          app.log.info(
            { externalRef: payload.external_ref, contentPieceId: contentPiece.id },
            'ingest idempotente: pieza ya existía',
          );
          reply.code(200);
          return {
            duplicated: true,
            content_piece_id: contentPiece.id,
            external_ref: payload.external_ref,
            status: contentPiece.status,
          };
        }

        app.log.info(
          {
            externalRef: payload.external_ref,
            contentPieceId: contentPiece.id,
            variants: contentPiece.variants.length,
          },
          'ingest aceptado',
        );
        reply.code(201);
        return {
          accepted: true,
          content_piece_id: contentPiece.id,
          external_ref: payload.external_ref,
          status: contentPiece.status,
          variants: contentPiece.variants.map((v) => ({
            id: v.id,
            kind: v.kind,
            scheduled_at: v.scheduledAt,
          })),
          warnings: issues.filter((i) => i.severity === 'warning'),
        };
      } catch (err) {
        // Race condition: dos requests concurrentes con el mismo external_ref.
        // Prisma devuelve P2002 (unique violation). Tratamos como duplicado.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          app.log.info(
            { externalRef: payload.external_ref },
            'ingest race condition resuelta como duplicado',
          );
          reply.code(200);
          return {
            duplicated: true,
            external_ref: payload.external_ref,
            note: 'Procesamiento concurrente detectado.',
          };
        }
        app.log.error({ err, externalRef: payload.external_ref }, 'ingest falló al persistir');
        reply.code(500);
        return { error: 'INTERNAL', external_ref: payload.external_ref };
      }
    },
  );
}
