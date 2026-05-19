import { type ContentStatus, prisma } from '@qyro/db';
import { getPublisher } from '@qyro/platform-adapters';
import { PLATFORM_RATE_LIMITS, VARIANT_TO_PLATFORM } from '@qyro/shared';
import { logger } from './logger.js';

const log = logger.child({ component: 'publishHandler' });

export interface PublishJobInput {
  platformVariantId: string;
  idempotencyKey: string;
}

/**
 * Handler de un job de publicación.
 *
 * Pasos:
 *   1. Carga la variante + cuenta social asociada.
 *   2. Verifica rate limit por plataforma (IG ≤ 25 posts API / 24h).
 *   3. Marca PublishJob.RUNNING + attempt++.
 *   4. Invoca al adapter. Token desencriptado (en Fase 5 mocked).
 *   5. Persiste resultado: platformPostId/videoId + publishedAt o lastError.
 *   6. Si todas las variantes de la pieza están PUBLISHED → ContentPiece.PUBLISHED.
 *   7. Devuelve / throw para que BullMQ haga retry exponencial en errores retryables.
 */
export async function handlePublishJob(input: PublishJobInput): Promise<{ ok: boolean }> {
  const variant = await prisma.platformVariant.findUnique({
    where: { id: input.platformVariantId },
    include: { contentPiece: true, socialAccount: true },
  });
  if (!variant) {
    log.warn({ variantId: input.platformVariantId }, 'variante no encontrada');
    return { ok: false };
  }

  const job = await prisma.publishJob.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (!job) {
    log.warn({ idempotencyKey: input.idempotencyKey }, 'PublishJob no encontrado');
    return { ok: false };
  }

  if (variant.publishedAt) {
    log.info({ variantId: variant.id }, 'variante ya publicada, idempotencia');
    return { ok: true };
  }

  const platform = VARIANT_TO_PLATFORM[variant.kind];
  if (await rateLimited(platform)) {
    log.warn({ platform }, 'rate limit alcanzado, reintentando más tarde');
    const err = new Error('RATE_LIMITED');
    (err as Error & { retryable?: boolean }).retryable = true;
    throw err;
  }

  await prisma.publishJob.update({
    where: { id: job.id },
    data: { status: 'RUNNING', attempt: { increment: 1 } },
  });

  const publisher = getPublisher(variant.kind);
  // En Fase 5 con mocks, accessToken es un placeholder. Cuando haya cuentas reales,
  // descifrar con @qyro/platform-adapters decryptToken(variant.socialAccount.accessTokenEncrypted).
  const accessToken = 'mock-token';
  const externalAccountId =
    variant.socialAccount?.igUserId ?? variant.socialAccount?.pageId ?? 'mock-acct';

  const result = await publisher.publish({
    kind: variant.kind,
    mediaUrl: variant.mediaUrl,
    mediaType: variant.mediaType,
    caption: variant.caption,
    hashtags: variant.hashtags,
    firstComment: variant.firstComment,
    musicRef: variant.musicRef,
    accessToken,
    externalAccountId,
    idempotencyKey: input.idempotencyKey,
  });

  if (result.ok) {
    await prisma.$transaction([
      prisma.platformVariant.update({
        where: { id: variant.id },
        data: {
          platformPostId: result.platformPostId,
          platformVideoId: result.platformVideoId ?? null,
          publishedAt: new Date(),
        },
      }),
      prisma.publishJob.update({
        where: { id: job.id },
        data: { status: 'SUCCESS', publishedAt: new Date(), lastError: null },
      }),
    ]);

    // ¿Todas las variantes de la pieza ya publicadas?
    const remaining = await prisma.platformVariant.count({
      where: {
        contentPieceId: variant.contentPieceId,
        scheduledAt: { not: null },
        publishedAt: null,
      },
    });
    if (remaining === 0) {
      await prisma.contentPiece.update({
        where: { id: variant.contentPieceId },
        data: { status: 'PUBLISHED' as ContentStatus },
      });
      await prisma.auditLog.create({
        data: {
          entityType: 'ContentPiece',
          entityId: variant.contentPieceId,
          contentPieceId: variant.contentPieceId,
          fromStatus: 'SCHEDULED',
          toStatus: 'PUBLISHED',
          actorUserId: null,
          comment: 'Todas las variantes publicadas',
        },
      });
    }
    log.info(
      {
        variantId: variant.id,
        platform,
        platformPostId: result.platformPostId,
        contentPieceId: variant.contentPieceId,
      },
      'publish OK',
    );
    return { ok: true };
  }

  await prisma.publishJob.update({
    where: { id: job.id },
    data: {
      status: result.retryable ? 'PENDING' : 'FAILED',
      lastError: `${result.errorCode}: ${result.errorMessage}`,
    },
  });

  if (!result.retryable) {
    await prisma.contentPiece.update({
      where: { id: variant.contentPieceId },
      data: { status: 'FAILED' as ContentStatus },
    });
    log.error(
      {
        variantId: variant.id,
        platform,
        errorCode: result.errorCode,
        contentPieceId: variant.contentPieceId,
      },
      'publish falló permanentemente',
    );
    return { ok: false };
  }

  const err = new Error(`${result.errorCode}: ${result.errorMessage}`);
  (err as Error & { retryable?: boolean }).retryable = true;
  log.warn(
    {
      variantId: variant.id,
      platform,
      errorCode: result.errorCode,
      contentPieceId: variant.contentPieceId,
    },
    'publish falló (retryable)',
  );
  throw err;
}

async function rateLimited(platform: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await prisma.platformVariant.count({
    where: {
      publishedAt: { gte: since },
      kind:
        platform === 'instagram'
          ? { in: ['instagram_reel', 'instagram_feed', 'instagram_story'] }
          : platform === 'facebook'
            ? { in: ['facebook_feed', 'facebook_reel'] }
            : { in: ['tiktok'] },
    },
  });
  const cap =
    platform === 'instagram'
      ? PLATFORM_RATE_LIMITS.instagram_posts_per_24h
      : PLATFORM_RATE_LIMITS.tiktok_posts_per_24h;
  return count >= cap;
}
