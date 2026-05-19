import { Worker } from 'bullmq';
import { loadConfig } from './config.js';
import { logger } from './logger.js';
import {
  type BoostJobData,
  type MetricsPullJobData,
  type PublishJobData,
  QUEUE_NAMES,
} from './queues/index.js';
import { redisConnection } from './redis.js';

const config = loadConfig();

/**
 * Worker arrancable. Las tres colas están registradas con handlers no-op que sólo
 * loguean. Se rellenan con lógica real en Fases 5, 6 y 7.
 */
async function main() {
  logger.info('🛠  Worker arrancando…');

  const publishWorker = new Worker<PublishJobData>(
    QUEUE_NAMES.publish,
    async (job) => {
      logger.info(
        { jobId: job.id, platformVariantId: job.data.platformVariantId },
        'publish job recibido (no-op, Fase 5 implementará)',
      );
      return { skipped: true, reason: 'phase-1.3-noop' };
    },
    { connection: redisConnection, concurrency: config.WORKER_PUBLISH_CONCURRENCY },
  );

  const metricsWorker = new Worker<MetricsPullJobData>(
    QUEUE_NAMES.metricsPull,
    async (job) => {
      logger.info({ jobId: job.id }, 'metrics-pull job (no-op, Fase 7)');
      return { skipped: true, reason: 'phase-1.3-noop' };
    },
    { connection: redisConnection, concurrency: config.WORKER_METRICS_CONCURRENCY },
  );

  const boostWorker = new Worker<BoostJobData>(
    QUEUE_NAMES.boost,
    async (job) => {
      logger.info(
        { jobId: job.id, contentPieceId: job.data.contentPieceId },
        'boost job (no-op, Fase 6)',
      );
      return { skipped: true, reason: 'phase-1.3-noop' };
    },
    { connection: redisConnection, concurrency: 1 },
  );

  const workers = [publishWorker, metricsWorker, boostWorker];

  for (const w of workers) {
    w.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err: err.message, queue: w.name }, 'job failed');
    });
    w.on('ready', () => logger.info({ queue: w.name }, 'worker listo'));
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'cerrando workers…');
    await Promise.all(workers.map((w) => w.close()));
    await redisConnection.quit();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'worker fatal');
  process.exit(1);
});
