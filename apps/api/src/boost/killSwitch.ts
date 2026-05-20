import { type Platform, prisma } from '@qyro/db';

export interface KillSwitchResult {
  allowed: boolean;
  daily: { committedEur: number; spentEur: number; capEur: number };
  monthly: { committedEur: number; spentEur: number; capEur: number };
  reason?: string;
}

export async function checkBudget(
  newBoostCents: number,
  platform: Platform,
  workspaceId: string,
  caps: { dailyCapEur: number; monthlyCapEur: number },
): Promise<KillSwitchResult> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const todayLedger = await prisma.boostSpendLedger.findFirst({
    where: { workspaceId, date: today, platform },
  });
  const monthLedger = await prisma.boostSpendLedger.aggregate({
    where: { workspaceId, date: { gte: monthStart }, platform },
    _sum: { spendCents: true, committedCents: true },
  });

  const daily = {
    committedEur: (todayLedger?.committedCents ?? 0) / 100,
    spentEur: (todayLedger?.spendCents ?? 0) / 100,
    capEur: caps.dailyCapEur,
  };
  const monthly = {
    committedEur: (monthLedger._sum.committedCents ?? 0) / 100,
    spentEur: (monthLedger._sum.spendCents ?? 0) / 100,
    capEur: caps.monthlyCapEur,
  };
  const newBoostEur = newBoostCents / 100;

  if (daily.committedEur + daily.spentEur + newBoostEur > daily.capEur) {
    return {
      allowed: false,
      daily,
      monthly,
      reason: `Excede el cap diario (${daily.capEur}€) — pendiente hoy: ${(
        daily.capEur - daily.committedEur - daily.spentEur
      ).toFixed(2)}€.`,
    };
  }
  if (monthly.committedEur + monthly.spentEur + newBoostEur > monthly.capEur) {
    return {
      allowed: false,
      daily,
      monthly,
      reason: `Excede el cap mensual (${monthly.capEur}€).`,
    };
  }
  return { allowed: true, daily, monthly };
}

export async function commitBudget(
  amountCents: number,
  platform: Platform,
  workspaceId: string,
): Promise<void> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  await prisma.boostSpendLedger.upsert({
    where: { workspaceId_date_platform: { workspaceId, date: today, platform } },
    create: { workspaceId, date: today, platform, committedCents: amountCents, spendCents: 0 },
    update: { committedCents: { increment: amountCents } },
  });
}
