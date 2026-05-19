import { type ContentStatus, type PlatformVariantKind, prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { recordStatusChange } from '../audit.js';
import { notificationBus } from '../notifications/bus.js';

/**
 * Endpoints CRUD/transición sobre ContentPiece — núcleo de la cola de validación
 * (Fase 3) y vista calendario (Fase 4).
 *
 * Todas las rutas requieren admin autenticado.
 */
export default async function contentPiecesRoutes(app: FastifyInstance) {
  // ── Listado con filtros ────────────────────────────────────────────────
  const listQuery = z.object({
    status: z.string().optional(),
    platform: z.string().optional(),
    persona: z.string().optional(),
    campaign: z.string().optional(),
    fromDate: z.string().datetime({ offset: true }).optional(),
    toDate: z.string().datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  });

  app.get('/content-pieces', { preHandler: [app.requireUser] }, async (req) => {
    const q = listQuery.parse(req.query);
    const statuses = q.status?.split(',') as ContentStatus[] | undefined;
    const platforms = q.platform?.split(',') as PlatformVariantKind[] | undefined;

    const items = await prisma.contentPiece.findMany({
      where: {
        ...(statuses?.length ? { status: { in: statuses } } : {}),
        ...(q.campaign ? { campaignId: q.campaign } : {}),
        ...(q.persona ? { buyerPersonas: { some: { buyerPersonaId: q.persona } } } : {}),
        ...(platforms?.length || q.fromDate || q.toDate
          ? {
              variants: {
                some: {
                  ...(platforms?.length ? { kind: { in: platforms } } : {}),
                  ...(q.fromDate || q.toDate
                    ? {
                        scheduledAt: {
                          ...(q.fromDate ? { gte: new Date(q.fromDate) } : {}),
                          ...(q.toDate ? { lte: new Date(q.toDate) } : {}),
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
      },
      include: {
        variants: true,
        buyerPersonas: { include: { buyerPersona: { select: { id: true, name: true } } } },
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: q.limit,
    });
    return { items };
  });

  // ── Detalle ────────────────────────────────────────────────────────────
  app.get('/content-pieces/:id', { preHandler: [app.requireUser] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const piece = await prisma.contentPiece.findUnique({
      where: { id },
      include: {
        variants: true,
        buyerPersonas: { include: { buyerPersona: true } },
        campaign: true,
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!piece) {
      reply.code(404);
      return { error: 'NOT_FOUND' };
    }
    return { piece };
  });

  // ── Aprobar → SCHEDULED ────────────────────────────────────────────────
  app.post('/content-pieces/:id/approve', { preHandler: [app.requireUser] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        qcChecklist: z.record(z.boolean()).optional(),
      })
      .parse(req.body ?? {});

    const piece = await prisma.contentPiece.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!piece) {
      reply.code(404);
      return { error: 'NOT_FOUND' };
    }
    if (!canTransition(piece.status, 'APPROVED')) {
      reply.code(409);
      return { error: 'INVALID_TRANSITION', from: piece.status, to: 'APPROVED' };
    }

    const allScheduled = piece.variants.every((v) => v.scheduledAt !== null);
    const nextStatus: ContentStatus = allScheduled ? 'SCHEDULED' : 'APPROVED';

    const updated = await prisma.contentPiece.update({
      where: { id },
      data: {
        status: nextStatus,
        qcChecklistJson: body.qcChecklist ? ({ manual: body.qcChecklist } as object) : undefined,
      },
    });
    await recordStatusChange({
      contentPieceId: id,
      fromStatus: piece.status,
      toStatus: nextStatus,
      actorUserId: req.user?.sub ?? null,
      comment: 'Aprobado por revisor',
    });
    await notificationBus.emitEvent({
      kind: 'content-piece.status-changed',
      data: { contentPieceId: id, from: piece.status, to: nextStatus },
    });
    return { piece: updated };
  });

  // ── Rechazar → REJECTED ────────────────────────────────────────────────
  app.post('/content-pieces/:id/reject', { preHandler: [app.requireUser] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z.object({ reason: z.string().min(1).max(2000) }).parse(req.body);

    const piece = await prisma.contentPiece.findUnique({ where: { id } });
    if (!piece) {
      reply.code(404);
      return { error: 'NOT_FOUND' };
    }
    if (!canTransition(piece.status, 'REJECTED')) {
      reply.code(409);
      return { error: 'INVALID_TRANSITION', from: piece.status, to: 'REJECTED' };
    }

    const updated = await prisma.contentPiece.update({
      where: { id },
      data: { status: 'REJECTED' },
    });
    await recordStatusChange({
      contentPieceId: id,
      fromStatus: piece.status,
      toStatus: 'REJECTED',
      actorUserId: req.user?.sub ?? null,
      comment: body.reason,
    });
    await notificationBus.emitEvent({
      kind: 'content-piece.status-changed',
      data: { contentPieceId: id, from: piece.status, to: 'REJECTED' },
    });
    return { piece: updated };
  });

  // ── Pedir cambios → CHANGES_REQUESTED ──────────────────────────────────
  app.post(
    '/content-pieces/:id/request-changes',
    { preHandler: [app.requireUser] },
    async (req, reply) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
      const body = z.object({ comment: z.string().min(1).max(2000) }).parse(req.body);

      const piece = await prisma.contentPiece.findUnique({ where: { id } });
      if (!piece) {
        reply.code(404);
        return { error: 'NOT_FOUND' };
      }
      if (!canTransition(piece.status, 'CHANGES_REQUESTED')) {
        reply.code(409);
        return { error: 'INVALID_TRANSITION', from: piece.status, to: 'CHANGES_REQUESTED' };
      }

      const updated = await prisma.contentPiece.update({
        where: { id },
        data: { status: 'CHANGES_REQUESTED' },
      });
      await recordStatusChange({
        contentPieceId: id,
        fromStatus: piece.status,
        toStatus: 'CHANGES_REQUESTED',
        actorUserId: req.user?.sub ?? null,
        comment: body.comment,
      });
      await notificationBus.emitEvent({
        kind: 'content-piece.status-changed',
        data: { contentPieceId: id, from: piece.status, to: 'CHANGES_REQUESTED' },
      });
      return { piece: updated };
    },
  );

  // ── Re-programar variante (drag & drop) ────────────────────────────────
  app.patch(
    '/content-pieces/:id/variants/:variantId/schedule',
    { preHandler: [app.requireUser] },
    async (req, reply) => {
      const { id, variantId } = z
        .object({ id: z.string().min(1), variantId: z.string().min(1) })
        .parse(req.params);
      const body = z
        .object({ scheduledAt: z.string().datetime({ offset: true }).nullable() })
        .parse(req.body);

      const piece = await prisma.contentPiece.findUnique({
        where: { id },
        include: { variants: { where: { id: variantId } } },
      });
      if (!piece || piece.variants.length === 0) {
        reply.code(404);
        return { error: 'NOT_FOUND' };
      }

      const updated = await prisma.platformVariant.update({
        where: { id: variantId },
        data: { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null },
      });
      await notificationBus.emitEvent({
        kind: 'content-piece.status-changed',
        data: { contentPieceId: id, from: piece.status, to: piece.status },
      });
      return { variant: updated };
    },
  );

  // ── Duplicar como variante A/B ─────────────────────────────────────────
  app.post(
    '/content-pieces/:id/duplicate',
    { preHandler: [app.requireUser] },
    async (req, reply) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
      const original = await prisma.contentPiece.findUnique({
        where: { id },
        include: { variants: true, buyerPersonas: true },
      });
      if (!original) {
        reply.code(404);
        return { error: 'NOT_FOUND' };
      }

      const duplicated = await prisma.contentPiece.create({
        data: {
          title: `${original.title} (variante B)`,
          format: original.format,
          status: 'DRAFT',
          campaignId: original.campaignId,
          conceptId: original.conceptId,
          frameworkUsed: original.frameworkUsed,
          hookUsed: original.hookUsed,
          createdBy: req.user?.sub ?? null,
          buyerPersonas: {
            create: original.buyerPersonas.map((bp) => ({ buyerPersonaId: bp.buyerPersonaId })),
          },
          variants: {
            create: original.variants.map((v) => ({
              kind: v.kind,
              mediaUrl: v.mediaUrl,
              mediaType: v.mediaType,
              ratio: v.ratio,
              durationS: v.durationS,
              caption: v.caption,
              hashtags: v.hashtags,
              firstComment: v.firstComment,
              musicRef: v.musicRef,
              scheduledAt: null,
            })),
          },
        },
        include: { variants: true },
      });

      await recordStatusChange({
        contentPieceId: duplicated.id,
        fromStatus: null,
        toStatus: 'DRAFT',
        actorUserId: req.user?.sub ?? null,
        comment: `Duplicado desde ${id} como variante A/B`,
        metadata: { sourceId: id },
      });

      reply.code(201);
      return { piece: duplicated };
    },
  );
}

const TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['APPROVED', 'SCHEDULED', 'REJECTED', 'CHANGES_REQUESTED'],
  CHANGES_REQUESTED: ['IN_REVIEW', 'REJECTED'],
  REJECTED: [],
  APPROVED: ['SCHEDULED', 'CHANGES_REQUESTED'],
  SCHEDULED: ['PUBLISHED', 'FAILED', 'CHANGES_REQUESTED'],
  PUBLISHED: ['ANALYZED', 'FAILED'],
  ANALYZED: [],
  FAILED: ['SCHEDULED'],
};

function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
