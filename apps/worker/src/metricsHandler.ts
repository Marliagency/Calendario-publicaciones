import { type Prisma, prisma } from '@qyro/db';
import { getPublisher } from '@qyro/platform-adapters';
import { logger } from './logger.js';

const log = logger.child({ component: 'metricsHandler' });

export interface MetricsJobInput {
  platformVariantIds?: string[];
}

/**
 * Handler del job metrics-pull (cron diario o trigger manual).
 *
 * Para cada variante publicada (o las indicadas):
 *   1. Llama al adapter `fetchInsights` (mock genera números plausibles).
 *   2. Persiste un registro `Metric` (kind=ORGANIC) con `dataJson` crudo.
 *   3. Si la pieza tiene AdCampaign activa, también persiste métrica PAID
 *      simulada y reconcilia `BoostSpendLedger` (mueve committed → spend).
 */
export async function handleMetricsJob(input: MetricsJobInput): Promise<{ processed: number }> {
  const variants = await prisma.platformVariant.findMany({
    where: {
      ...(input.platformVariantIds?.length ? { id: { in: input.platformVariantIds } } : {}),
      publishedAt: { not: null },
    },
    include: { adCampaigns: { where: { status: 'ACTIVE' } } },
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

    // Si hay ad activa, mock spend + reconciliar ledger.
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
        where: { date_platform: { date: dayStart, platform: camp.platform } },
        create: {
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
