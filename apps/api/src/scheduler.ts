import { prisma } from '@qyro/db';
import { buildIdempotencyKey, publishQueue } from './queues.js';

/**
 * Cuando una pieza pasa a SCHEDULED, encolamos un `PublishJob` por cada
 * variante con `scheduledAt` definido. Idempotente: si ya existe un job con
 * la misma idempotencyKey, no se crea uno nuevo.
 */
export async function schedulePublishJobsFor(contentPieceId: string): Promise<{
  enqueued: number;
  skipped: number;
}> {
  const piece = await prisma.contentPiece.findUnique({
    where: { id: contentPieceId },
    include: { variants: true },
  });
  if (!piece) return { enqueued: 0, skipped: 0 };

  let enqueued = 0;
  let skipped = 0;

  for (const v of piece.variants) {
    if (!v.scheduledAt) {
      skipped++;
      continue;
    }
    const idempotencyKey = buildIdempotencyKey({
      contentPieceId,
      variantKind: v.kind,
      scheduledAt: v.scheduledAt,
    });

    const existing = await prisma.publishJob.findUnique({ where: { idempotencyKey } });
    if (existing && existing.status !== 'CANCELLED') {
      skipped++;
      continue;
    }

    if (existing?.status === 'CANCELLED') {
      await prisma.publishJob.delete({ where: { id: existing.id } });
    }

    await prisma.publishJob.create({
      data: {
        platformVariantId: v.id,
        status: 'PENDING',
        scheduledAt: v.scheduledAt,
        idempotencyKey,
      },
    });

    const delay = Math.max(0, v.scheduledAt.getTime() - Date.now());
    await publishQueue().add(
      'publish',
      { platformVariantId: v.id, idempotencyKey },
      {
        delay,
        jobId: idempotencyKey,
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { age: 86_400 },
        removeOnFail: { age: 7 * 86_400 },
      },
    );
    enqueued++;
  }
  return { enqueued, skipped };
}
