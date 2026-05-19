import type { FastifyInstance } from 'fastify';
import { notificationBus } from '../notifications/bus.js';

/**
 * SSE endpoint para que la PWA reciba eventos en tiempo real (piezas nuevas en
 * revisión, cambios de estado, fallos de publicación).
 *
 * Diseño:
 *   - Heartbeat cada 25s para sobrevivir a proxies que tumban conexiones idle.
 *   - El cliente se reconecta automáticamente (EventSource del navegador).
 *   - Auth: requiere usuario admin autenticado (cookie httpOnly).
 */
export default async function sseRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: [app.requireUser] }, async (req, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send('ready', { ts: new Date().toISOString() });

    const unsubscribe = notificationBus.subscribe((evt) => {
      send(evt.kind, evt.data);
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(': keepalive\n\n');
    }, 25_000);

    req.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });
}
