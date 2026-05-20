import { createHash } from 'node:crypto';
import { Queue } from 'bullmq';
import { redisConnection } from './redis.js';

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
  workspaceId: string;
  audiencePresetId?: string;
  dailyBudgetCents: number;
  durationDays: number;
  objective: string;
}

export interface MetricsPullJobData {
  platformVariantIds?: string[];
}

/**
 * Calcula la idempotency key de un publish: hash(content_piece_id + platform + scheduled_at).
 * §5 del brief: dos enqueues con el mismo (pieza, plataforma, hora) no duplican publicación.
 */
export function buildIdempotencyKey(args: {
  contentPieceId: string;
  variantKind: string;
  scheduledAt: Date;
}): string {
  return createHash('sha256')
    .update(`${args.contentPieceId}|${args.variantKind}|${args.scheduledAt.toISOString()}`)
    .digest('hex');
}

let publishQ: Queue<PublishJobData> | null = null;
let boostQ: Queue<BoostJobData> | null = null;
let metricsQ: Queue<MetricsPullJobData> | null = null;

export function publishQueue(): Queue<PublishJobData> {
  if (!publishQ) {
    publishQ = new Queue<PublishJobData>(QUEUE_NAMES.publish, { connection: redisConnection });
  }
  return publishQ;
}
export function boostQueue(): Queue<BoostJobData> {
  if (!boostQ) {
    boostQ = new Queue<BoostJobData>(QUEUE_NAMES.boost, { connection: redisConnection });
  }
  return boostQ;
}
export function metricsQueue(): Queue<MetricsPullJobData> {
  if (!metricsQ) {
    metricsQ = new Queue<MetricsPullJobData>(QUEUE_NAMES.metricsPull, {
      connection: redisConnection,
    });
  }
  return metricsQ;
}
