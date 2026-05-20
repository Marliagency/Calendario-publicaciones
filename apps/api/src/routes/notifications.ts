import { prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export default async function notificationsRoutes(app: FastifyInstance) {
  const wm = app.requireWorkspaceMember();

  app.get('/notifications', { preHandler: [app.requireUser, wm] }, async (req) => {
    const workspaceId = req.workspace!.id;
    const items = await prisma.notificationDelivery.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items };
  });

  app.get('/notifications/unread-count', { preHandler: [app.requireUser, wm] }, async (req) => {
    const workspaceId = req.workspace!.id;
    const [pendingReview, unreadDeliveries] = await Promise.all([
      prisma.contentPiece.count({ where: { workspaceId, status: 'IN_REVIEW' } }),
      prisma.notificationDelivery.count({ where: { workspaceId, readAt: null } }),
    ]);
    return { in_review: pendingReview, unread_deliveries: unreadDeliveries };
  });

  app.post('/notifications/:id/read', { preHandler: [app.requireUser, wm] }, async (req) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const workspaceId = req.workspace!.id;
    const updated = await prisma.notificationDelivery.update({
      where: { id, workspaceId },
      data: { readAt: new Date() },
    });
    return { id: updated.id, readAt: updated.readAt };
  });
}
