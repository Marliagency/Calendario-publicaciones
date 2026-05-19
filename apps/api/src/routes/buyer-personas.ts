import { prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';

export default async function buyerPersonasRoutes(app: FastifyInstance) {
  app.get('/buyer-personas', { preHandler: [app.requireUser] }, async () => {
    const items = await prisma.buyerPersona.findMany({ orderBy: { name: 'asc' } });
    return { items };
  });

  app.get('/campaigns', { preHandler: [app.requireUser] }, async () => {
    const items = await prisma.campaign.findMany({ orderBy: { startAt: 'desc' } });
    return { items };
  });
}
