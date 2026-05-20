import { prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  type QCIssueSeverity,
  type QCRuleSnapshot,
  evaluateAutomaticRules,
} from '../qc/evaluators.js';

export default async function qcRoutes(app: FastifyInstance) {
  const wm = app.requireWorkspaceMember();

  app.get('/qc-rules', { preHandler: [app.requireUser, wm] }, async (req) => {
    const workspaceId = req.workspace!.id;
    const items = await prisma.qCRule.findMany({
      where: { workspaceId, enabled: true },
      orderBy: { severity: 'asc' },
    });
    return { items };
  });

  app.post('/content-pieces/:id/qc-run', { preHandler: [app.requireUser, wm] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const workspaceId = req.workspace!.id;

    const piece = await prisma.contentPiece.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!piece || piece.workspaceId !== workspaceId) {
      reply.code(404);
      return { error: 'NOT_FOUND' };
    }

    const rules = await prisma.qCRule.findMany({
      where: {
        workspaceId,
        enabled: true,
        appliesToFormats: { has: piece.format },
      },
    });

    const ruleSnapshots: QCRuleSnapshot[] = rules.map((r) => ({
      id: r.id,
      ruleType: r.ruleType,
      severity: r.severity as QCIssueSeverity,
      enabled: r.enabled,
    }));

    const variantSnapshots = piece.variants.map((v) => ({
      kind: v.kind,
      ratio: v.ratio,
      durationS: v.durationS,
      caption: v.caption,
      hashtags: v.hashtags,
      musicRef: v.musicRef,
    }));

    const automatic = evaluateAutomaticRules(ruleSnapshots, variantSnapshots);

    const manualRules = rules
      .filter((r) =>
        ['HOOK_IN_3S', 'CTA_PRESENT', 'THUMBNAIL_TEXT_READABLE', 'CAPTION_TYPOS'].includes(
          r.ruleType,
        ),
      )
      .map((r) => ({
        ruleId: r.id,
        ruleType: r.ruleType,
        name: r.name,
        severity: r.severity,
        description: r.description,
      }));

    return { automatic, manual: manualRules };
  });
}
