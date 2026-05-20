import { type Prisma, prisma } from '@qyro/db';
import { getPublisher } from '@qyro/platform-adapters';
import { logger } from './logger.js';

const log = logger.child({ component: 'metricsHandler' });

export interface MetricsJobInput {
  platformVariantIds?: string[];
}

export async function handleMetricsJob(input: MetricsJobInput): Promise<{ processed: number }> {
  const variants = await prisma.platformVariant.findMany({
    where: {
      ...(input.platformVariantIds?.length ? { id: { in: input.platformVariantIds } } : {}),
      publishedAt: { not: null },
    },
    include: {
      adCampaigns: { where: { status: 'ACTIVE' } },
      contentPiece: { select: { workspaceId: true } },
    },
  });

  let processed = 0;

  for (const v of variants) {
    if (!v.platformPostId) continue;
    const publisher = getPublisher(v.kind);
    const insights = await publisher.fetchInsights({
      platformPostId: v.platformPostId,
      accessToken: 'mock-token',
      externalAccountId: 'mock-acct',
    });
    await prisma.metric.create({
      data: {
        platformVariantId: v.id,
        kind: 'ORGANIC',
        dataJson: insights.organic as unknown as Prisma.InputJsonValue,
      },
    });

    const workspaceId = v.contentPiece.workspaceId;

    for (const camp of v.adCampaigns) {
      const dailyCents = camp.dailyBudgetCents ?? 100;
      const spentToday = Math.round(dailyCents * (0.6 + Math.random() * 0.4));
      await prisma.adCampaign.update({
        where: { id: camp.id },
        data: { spendCents: { increment: spentToday } },
      });
      await prisma.metric.create({
        data: {
          platformVariantId: v.id,
          kind: 'PAID',
          dataJson: {
            spend_cents: spentToday,
            impressions: 800 + Math.round(Math.random() * 12_000),
            clicks: 5 + Math.round(Math.random() * 200),
          } as unknown as Prisma.InputJsonValue,
        },
      });

      const today = new Date();
      const dayStart = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
      );
      await prisma.boostSpendLedger.upsert({
        where: { workspaceId_date_platform: { workspaceId, date: dayStart, platform: camp.platform } },
        create: {
          workspaceId,
          date: dayStart,
          platform: camp.platform,
          spendCents: spentToday,
          committedCents: 0,
        },
        update: {
          spendCents: { increment: spentToday },
          committedCents: { decrement: spentToday },
        },
      });
    }
    processed++;
  }

  log.info({ processed }, 'métricas refrescadas');
  return { processed };
}
