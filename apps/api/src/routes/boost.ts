import { prisma } from '@qyro/db';
import { VARIANT_TO_PLATFORM } from '@qyro/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { checkBudget, commitBudget } from '../boost/killSwitch.js';
import { boostQueue } from '../queues.js';

/**
 * Boost endpoints:
 *   - POST /content-pieces/:id/boost      → marcar pieza con presupuesto y encolar
 *   - GET  /boost/spend-summary           → estado del kill switch en vivo
 *   - GET  /audience-presets              → presets seedeados
 *
 * Presets de presupuesto pequeño:
 *   - 1€ x 3 días = 300 cents/día, 3 días = 900 cents totales
 *   - 2€ x 5 días = 200 cents/día, 5 días = 1000 cents totales
 */
export default async function boostRoutes(app: FastifyInstance) {
  app.post('/content-pieces/:id/boost', { preHandler: [app.requireUser] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = z
      .object({
        dailyBudgetEur: z.number().positive().max(50),
        durationDays: z.number().int().positive().max(30),
        objective: z.enum(['REACH', 'VIDEO_VIEWS', 'TRAFFIC', 'CONVERSIONS', 'FOLLOWERS']),
        audiencePresetId: z.string().min(1),
      })
      .parse(req.body);

    const piece = await prisma.contentPiece.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!piece) {
      reply.code(404);
      return { error: 'NOT_FOUND' };
    }
    const firstVariant = piece.variants[0];
    if (!firstVariant) {
      reply.code(400);
      return { error: 'NO_VARIANTS' };
    }
    const platform = VARIANT_TO_PLATFORM[firstVariant.kind];
    const totalCents = Math.round(body.dailyBudgetEur * body.durationDays * 100);

    const budget = await checkBudget(totalCents, platform);
    if (!budget.allowed) {
      app.log.warn(
        { contentPieceId: id, totalCents, platform, reason: budget.reason },
        'boost rechazado por kill switch',
      );
      reply.code(409);
      return { error: 'BUDGET_CAP_EXCEEDED', ...budget };
    }

    await prisma.contentPiece.update({
      where: { id },
      data: {
        boostBudgetEur: body.dailyBudgetEur,
        boostDurationDays: body.durationDays,
        boostObjective: body.objective,
        boostAudiencePresetId: body.audiencePresetId,
      },
    });
    await commitBudget(totalCents, platform);
    await boostQueue().add(
      'boost',
      {
        contentPieceId: id,
        audiencePresetId: body.audiencePresetId,
        dailyBudgetCents: Math.round(body.dailyBudgetEur * 100),
        durationDays: body.durationDays,
        objective: body.objective,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { age: 86_400 },
      },
    );

    app.log.info({ contentPieceId: id, totalCents }, 'boost encolado');
    return {
      accepted: true,
      contentPieceId: id,
      totalCents,
      budget,
    };
  });

  app.get('/boost/spend-summary', { preHandler: [app.requireUser] }, async () => {
    const r = await checkBudget(0, 'instagram');
    return r;
  });

  app.get('/audience-presets', { preHandler: [app.requireUser] }, async () => {
    const items = await prisma.audiencePreset.findMany({ orderBy: { name: 'asc' } });
    return { items };
  });
}
