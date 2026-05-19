import { prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

/**
 * Endpoints para la PWA:
 *   - GET  /notifications              → últimas 50 entregadas (con readAt nullable).
 *   - GET  /notifications/unread-count → contador para el badge.
 *   - POST /notifications/:id/read     → marcar como leída.
 */
export default async function notificationsRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: [app.requireUser] }, async () => {
    const items = await prisma.notificationDelivery.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items };
  });

  app.get('/notifications/unread-count', { preHandler: [app.requireUser] }, async () => {
    const [pendingReview, unreadDeliveries] = await Promise.all([
      prisma.contentPiece.count({ where: { status: 'IN_REVIEW' } }),
      prisma.notificationDelivery.count({ where: { readAt: null } }),
    ]);
    return { in_review: pendingReview, unread_deliveries: unreadDeliveries };
  });

  app.post('/notifications/:id/read', { preHandler: [app.requireUser] }, async (req) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const updated = await prisma.notificationDelivery.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return { id: updated.id, readAt: updated.readAt };
  });
}
