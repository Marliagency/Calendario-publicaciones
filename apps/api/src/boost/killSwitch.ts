import { type Platform, prisma } from '@qyro/db';
import { loadConfig } from '../config.js';

const config = loadConfig();

/**
 * Kill switch de gasto (ADR 0002 — 5€/día, 150€/mes globales).
 *
 * Cuenta:
 *   - spend_cents reconciliado contra Meta/TT (cron de Fase 7).
 *   - committed_cents: presupuestos encolados pero aún no gastados.
 *
 * Antes de aceptar un nuevo boost se suman ambos: si exceden cap → rechaza.
 */
export interface KillSwitchResult {
  allowed: boolean;
  daily: { committedEur: number; spentEur: number; capEur: number };
  monthly: { committedEur: number; spentEur: number; capEur: number };
  reason?: string;
}

export async function checkBudget(
  newBoostCents: number,
  platform: Platform,
): Promise<KillSwitchResult> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const todayLedger = await prisma.boostSpendLedger.findFirst({
    where: { date: today, platform },
  });
  const monthLedger = await prisma.boostSpendLedger.aggregate({
    where: { date: { gte: monthStart }, platform },
    _sum: { spendCents: true, committedCents: true },
  });

  const daily = {
    committedEur: (todayLedger?.committedCents ?? 0) / 100,
    spentEur: (todayLedger?.spendCents ?? 0) / 100,
    capEur: config.BUDGET_DAILY_CAP_EUR,
  };
  const monthly = {
    committedEur: (monthLedger._sum.committedCents ?? 0) / 100,
    spentEur: (monthLedger._sum.spendCents ?? 0) / 100,
    capEur: config.BUDGET_MONTHLY_CAP_EUR,
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

/** Reserva un boost en el ledger (committed_cents += amount). Tras gasto real, otro cron lo mueve a spend_cents. */
export async function commitBudget(amountCents: number, platform: Platform): Promise<void> {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  await prisma.boostSpendLedger.upsert({
    where: { date_platform: { date: today, platform } },
    create: { date: today, platform, committedCents: amountCents, spendCents: 0 },
    update: { committedCents: { increment: amountCents } },
  });
}
