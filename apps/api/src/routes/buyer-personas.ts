import { prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';

export default async function buyerPersonasRoutes(app: FastifyInstance) {
  const wm = app.requireWorkspaceMember();

  app.get('/buyer-personas', { preHandler: [app.requireUser, wm] }, async (req) => {
    const workspaceId = req.workspace!.id;
    const items = await prisma.buyerPersona.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
    return { items };
  });

  app.get('/campaigns', { preHandler: [app.requireUser, wm] }, async (req) => {
    const workspaceId = req.workspace!.id;
    const items = await prisma.campaign.findMany({
      where: { workspaceId },
      orderBy: { startAt: 'desc' },
    });
    return { items };
  });
}
