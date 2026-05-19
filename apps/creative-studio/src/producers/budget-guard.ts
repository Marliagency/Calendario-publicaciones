import type { Config } from '../config.js';
import { logger } from '../logger.js';

/**
 * Kill switch de gasto del estudio creativo.
 *
 * Reglas (§8.1 del brief):
 *   - Soft warn al 70% del cap mensual.
 *   - Hard block al 95% del cap mensual.
 *   - Modelos premium (Veo 3.1, Sora 2, Kling 3.0 premium) están en
 *     `HIGGSFIELD_PREMIUM_MODELS` y se bloquean por encima del 95%
 *     incluso si quedan créditos.
 *
 * Estado: in-memory para esta fase. Cuando exista persistencia,
 * mover a una tabla `CreativeCost` con consultas por mes natural.
 */

export interface BudgetCheckResult {
  allowed: boolean;
  /** 'allowed' | 'warn_threshold' | 'hard_block' | 'premium_blocked'. */
  reason: 'allowed' | 'warn_threshold' | 'hard_block' | 'premium_blocked';
  spent: number;
  budget: number;
  pctUsed: number;
  message?: string;
}

export class HiggsfieldBudgetGuard {
  private spent = 0;

  constructor(
    private readonly cfg: Pick<
      Config,
      | 'HIGGSFIELD_MONTHLY_CREDIT_BUDGET'
      | 'HIGGSFIELD_SOFT_WARN_AT_PCT'
      | 'HIGGSFIELD_HARD_BLOCK_AT_PCT'
      | 'HIGGSFIELD_PREMIUM_MODELS'
    >,
    initialSpent = 0,
  ) {
    this.spent = initialSpent;
  }

  /** Snapshot lectura-solo del estado actual. */
  status(): { spent: number; budget: number; pctUsed: number } {
    return {
      spent: this.spent,
      budget: this.cfg.HIGGSFIELD_MONTHLY_CREDIT_BUDGET,
      pctUsed: (this.spent / this.cfg.HIGGSFIELD_MONTHLY_CREDIT_BUDGET) * 100,
    };
  }

  /**
   * ¿Puedo gastar `credits` créditos en `model`?
   *
   * Idempotente — no muta el estado. Llama a `recordSpend` tras consumir.
   */
  check(credits: number, model: string): BudgetCheckResult {
    const budget = this.cfg.HIGGSFIELD_MONTHLY_CREDIT_BUDGET;
    const afterSpend = this.spent + credits;
    const pctUsed = (afterSpend / budget) * 100;
    const isPremium = this.cfg.HIGGSFIELD_PREMIUM_MODELS.includes(model);
    const base = { spent: this.spent, budget, pctUsed };

    if (pctUsed >= this.cfg.HIGGSFIELD_HARD_BLOCK_AT_PCT) {
      return {
        ...base,
        allowed: false,
        reason: 'hard_block',
        message: `Hard block: ${pctUsed.toFixed(1)}% >= ${this.cfg.HIGGSFIELD_HARD_BLOCK_AT_PCT}% del cap mensual.`,
      };
    }

    if (isPremium && pctUsed >= this.cfg.HIGGSFIELD_HARD_BLOCK_AT_PCT - 10) {
      return {
        ...base,
        allowed: false,
        reason: 'premium_blocked',
        message: `Premium ${model} bloqueado: ${pctUsed.toFixed(1)}% del cap mensual. Sólo no-premium en zona alta.`,
      };
    }

    if (pctUsed >= this.cfg.HIGGSFIELD_SOFT_WARN_AT_PCT) {
      return {
        ...base,
        allowed: true,
        reason: 'warn_threshold',
        message: `Warning: ${pctUsed.toFixed(1)}% >= ${this.cfg.HIGGSFIELD_SOFT_WARN_AT_PCT}% del cap mensual.`,
      };
    }

    return { ...base, allowed: true, reason: 'allowed' };
  }

  /** Registra gasto real tras consumir. */
  recordSpend(credits: number, meta: { model: string; externalRef: string }): void {
    this.spent += credits;
    const status = this.status();
    if (status.pctUsed >= this.cfg.HIGGSFIELD_SOFT_WARN_AT_PCT) {
      logger.warn(
        { ...status, ...meta },
        `BudgetGuard: ${status.pctUsed.toFixed(1)}% del cap consumido`,
      );
    } else {
      logger.info({ ...status, ...meta }, 'BudgetGuard spend registrado');
    }
  }
}

export class BudgetExceededError extends Error {
  constructor(
    msg: string,
    public readonly check: BudgetCheckResult,
  ) {
    super(msg);
    this.name = 'BudgetExceededError';
  }
}
