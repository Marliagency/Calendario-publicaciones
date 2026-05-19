import { describe, expect, it } from 'vitest';
import { HiggsfieldBudgetGuard } from './budget-guard.js';

const cfg = {
  HIGGSFIELD_MONTHLY_CREDIT_BUDGET: 1000,
  HIGGSFIELD_SOFT_WARN_AT_PCT: 70,
  HIGGSFIELD_HARD_BLOCK_AT_PCT: 95,
  HIGGSFIELD_PREMIUM_MODELS: ['veo_3_1', 'sora_2'],
};

describe('HiggsfieldBudgetGuard', () => {
  it('permite gasto bajo cuota normal', () => {
    const g = new HiggsfieldBudgetGuard(cfg);
    const r = g.check(10, 'seedance_2_0');
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('allowed');
  });

  it('warn al cruzar 70%', () => {
    const g = new HiggsfieldBudgetGuard(cfg, 690);
    const r = g.check(20, 'seedance_2_0'); // 710 → 71%
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('warn_threshold');
  });

  it('hard block al cruzar 95%', () => {
    const g = new HiggsfieldBudgetGuard(cfg, 940);
    const r = g.check(20, 'seedance_2_0'); // 960 → 96%
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('hard_block');
  });

  it('premium bloqueado por encima de 85% (HARD_BLOCK_AT_PCT - 10)', () => {
    const g = new HiggsfieldBudgetGuard(cfg, 840);
    const r = g.check(20, 'veo_3_1'); // 860 → 86%
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('premium_blocked');
  });

  it('no-premium pasa a 86% (solo warn)', () => {
    const g = new HiggsfieldBudgetGuard(cfg, 840);
    const r = g.check(20, 'seedance_2_0'); // 860 → 86%
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('warn_threshold');
  });

  it('recordSpend actualiza el estado', () => {
    const g = new HiggsfieldBudgetGuard(cfg);
    g.recordSpend(50, { model: 'seedance_2_0', externalRef: 'r1' });
    expect(g.status()).toEqual({ spent: 50, budget: 1000, pctUsed: 5 });
  });
});
