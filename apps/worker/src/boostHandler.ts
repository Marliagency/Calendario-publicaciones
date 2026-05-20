import { prisma } from '@qyro/db';
import { VARIANT_TO_PLATFORM } from '@qyro/shared';
import { logger } from './logger.js';

const log = logger.child({ component: 'boostHandler' });

export interface BoostJobInput {
  contentPieceId: string;
  workspaceId: string;
  audiencePresetId?: string;
  dailyBudgetCents: number;
  durationDays: number;
  objective: string;
}

export async function handleBoostJob(input: BoostJobInput): Promise<{ ok: boolean }> {
  const piece = await prisma.contentPiece.findUnique({
    where: { id: input.contentPieceId },
    include: { variants: true },
  });
  if (!piece || piece.workspaceId !== input.workspaceId) return { ok: false };

  const publishedVariant = piece.variants.find((v) => v.publishedAt && v.platformPostId);
  if (!publishedVariant) {
    log.info({ contentPieceId: input.contentPieceId }, 'boost esperando publicación orgánica');
    const err = new Error('NOT_PUBLISHED_YET');
    (err as Error & { retryable?: boolean }).retryable = true;
    throw err;
  }

  const platform = VARIANT_TO_PLATFORM[publishedVariant.kind];

  const mockCampaignId = `${platform}_camp_${Date.now()}`;
  const mockAdsetId = `${platform}_adset_${Date.now()}`;
  const mockAdId = `${platform}_ad_${Date.now()}`;

  const lifetimeCents = input.dailyBudgetCents * input.durationDays;

  await prisma.adCampaign.create({
    data: {
      workspaceId: input.workspaceId,
      platformVariantId: publishedVariant.id,
      platform,
      externalCampaignId: mockCampaignId,
      externalAdsetId: mockAdsetId,
      externalAdId: mockAdId,
      dailyBudgetCents: input.dailyBudgetCents,
      lifetimeBudgetCents: lifetimeCents,
      status: 'ACTIVE',
      startedAt: new Date(),
      endedAt: new Date(Date.now() + input.durationDays * 86_400_000),
      audiencePresetId: input.audiencePresetId ?? null,
    },
  });

  log.info(
    {
      contentPieceId: input.contentPieceId,
      workspaceId: input.workspaceId,
      platform,
      mockCampaignId,
      lifetimeCents,
    },
    'boost (mock) ACTIVE',
  );
  return { ok: true };
}
