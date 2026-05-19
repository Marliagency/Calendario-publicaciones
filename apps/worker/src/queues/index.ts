/**
 * Nombres de cola compartidos entre `apps/api` (productor) y `apps/worker` (consumidor).
 *
 * En Fase 1.3 sólo registramos las colas con workers no-op. La lógica real llega:
 *   - publish      → Fase 5
 *   - metrics-pull → Fase 7
 *   - boost        → Fase 6
 */
export const QUEUE_NAMES = {
  publish: 'qyro.publish',
  metricsPull: 'qyro.metrics-pull',
  boost: 'qyro.boost',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface PublishJobData {
  platformVariantId: string;
  idempotencyKey: string;
}

export interface BoostJobData {
  contentPieceId: string;
  audiencePresetId?: string;
  dailyBudgetCents: number;
  durationDays: number;
  objective: string;
}

export interface MetricsPullJobData {
  /** Si está vacío, hace pull de todas las piezas PUBLISHED. */
  platformVariantIds?: string[];
}
