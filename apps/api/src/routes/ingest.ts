import { Prisma } from '@qyro/db';
import { ingestPayloadSchema } from '@qyro/shared';
import type { FastifyInstance } from 'fastify';
import { persistIngest } from '../ingest/persist.js';
import { hasBlockers, validateIngestPayload } from '../ingest/validate.js';

/**
 * Endpoint de ingest del Estudio Creativo (SESIÓN 2).
 *
 * Auth: X-Service-API-Key de workspace (WorkspaceApiKey). La key resuelve
 * automáticamente el workspace_id — el Estudio no necesita pasarlo en el body.
 *
 * Flujo:
 *   1. Auth por WorkspaceApiKey → req.workspace populated.
 *   2. Valida payload Zod.
 *   3. Valida cruzado contra límites de plataforma (ratio, duración, hashtags, caption).
 *   4. Si hay BLOCKERS → 400 con detalle.
 *   5. Persiste atómicamente (ContentPiece + N PlatformVariants + AuditLog).
 *   6. Idempotente por (workspaceId, external_ref).
 *   7. Emite evento SSE `content-piece.ingested`.
 */
export default async function ingestRoutes(app: FastifyInstance) {
  app.post(
    '/content-pieces/ingest',
    { preHandler: [app.requireWorkspaceApiKey] },
    async (req, reply) => {
      const workspaceId = req.workspace!.id;

      const parsed = ingestPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: 'INVALID_PAYLOAD', details: parsed.error.flatten() };
      }

      const payload = parsed.data;
      const issues = validateIngestPayload(payload);

      if (hasBlockers(issues)) {
        app.log.warn(
          { externalRef: payload.external_ref, workspaceId, issues: issues.filter((i) => i.severity === 'blocker') },
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
          workspaceId,
        );

        if (duplicated) {
          app.log.info({ externalRef: payload.external_ref, workspaceId }, 'ingest idempotente');
          reply.code(200);
          return {
            duplicated: true,
            workspace_id: workspaceId,
            content_piece_id: contentPiece.id,
            external_ref: payload.external_ref,
            status: contentPiece.status,
          };
        }

        app.log.info(
          { externalRef: payload.external_ref, workspaceId, contentPieceId: contentPiece.id },
          'ingest aceptado',
        );
        reply.code(201);
        return {
          accepted: true,
          workspace_id: workspaceId,
          workspace_slug: req.workspace!.slug,
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
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          reply.code(200);
          return { duplicated: true, external_ref: payload.external_ref, workspace_id: workspaceId };
        }
        app.log.error({ err, externalRef: payload.external_ref, workspaceId }, 'ingest falló');
        reply.code(500);
        return { error: 'INTERNAL', external_ref: payload.external_ref };
      }
    },
  );
}
