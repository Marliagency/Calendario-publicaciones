import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify from 'fastify';
import { loadConfig } from './config.js';
import { logger } from './logger.js';
import authPlugin from './middleware/authPlugin.js';
import authRoutes from './routes/auth.js';
import buyerPersonasRoutes from './routes/buyer-personas.js';
import contentPiecesRoutes from './routes/content-pieces.js';
import healthRoutes from './routes/health.js';
import ingestRoutes from './routes/ingest.js';
import notificationsRoutes from './routes/notifications.js';
import oauthRoutes from './routes/oauth.js';
import qcRoutes from './routes/qc.js';
import sseRoutes from './routes/sse.js';

export async function buildServer() {
  const config = loadConfig();
  const app = Fastify({ loggerInstance: logger, trustProxy: true });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: [config.WEB_BASE_URL],
    credentials: true,
  });
  await app.register(cookie);
  await app.register(sensible);
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(ingestRoutes, { prefix: '/api/v1' });
  await app.register(contentPiecesRoutes, { prefix: '/api/v1' });
  await app.register(qcRoutes, { prefix: '/api/v1' });
  await app.register(buyerPersonasRoutes, { prefix: '/api/v1' });
  await app.register(notificationsRoutes, { prefix: '/api/v1' });
  await app.register(sseRoutes, { prefix: '/sse' });
  await app.register(oauthRoutes, { prefix: '/auth' });

  app.setErrorHandler((err, _req, reply) => {
    const status = reply.statusCode >= 400 ? reply.statusCode : 500;
    app.log.error({ err, status }, 'request failed');
    reply.code(status).send({ error: err.message ?? 'INTERNAL' });
  });

  return app;
}

async function main() {
  const config = loadConfig();
  const app = await buildServer();
  try {
    await app.listen({ host: config.API_HOST, port: config.API_PORT });
    app.log.info(`🚀 API escuchando en ${config.API_BASE_URL}`);
  } catch (err) {
    app.log.error({ err }, 'API falló al arrancar');
    process.exit(1);
  }
}

const isEntry = import.meta.url === `file://${process.argv[1]}`;
if (isEntry) {
  main();
}
