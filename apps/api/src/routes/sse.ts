import type { FastifyInstance } from 'fastify';
import { notificationBus } from '../notifications/bus.js';

export default async function sseRoutes(app: FastifyInstance) {
  const wm = app.requireWorkspaceMember();

  app.get('/notifications', { preHandler: [app.requireUser, wm] }, async (req, reply) => {
    const workspaceId = req.workspace!.id;

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
      if (evt.workspaceId === workspaceId) {
        send(evt.kind, evt.data);
      }
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
