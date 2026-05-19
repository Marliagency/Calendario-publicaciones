import { prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  app.get('/health/ready', async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', db: 'ok' };
    } catch (err) {
      app.log.error({ err }, 'readiness check fallida');
      reply.code(503);
      return { status: 'not_ready', db: 'fail' };
    }
  });
}
