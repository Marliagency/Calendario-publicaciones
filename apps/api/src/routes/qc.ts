import { prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  type QCIssueSeverity,
  type QCRuleSnapshot,
  evaluateAutomaticRules,
} from '../qc/evaluators.js';

/**
 * Endpoints QC:
 *   - GET  /qc-rules                    → lista reglas activas
 *   - POST /content-pieces/:id/qc-run   → evalúa reglas auto contra una pieza
 */
export default async function qcRoutes(app: FastifyInstance) {
  app.get('/qc-rules', { preHandler: [app.requireUser] }, async () => {
    const items = await prisma.qCRule.findMany({
      where: { enabled: true },
      orderBy: { severity: 'asc' },
    });
    return { items };
  });

  app.post('/content-pieces/:id/qc-run', { preHandler: [app.requireUser] }, async (req, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const piece = await prisma.contentPiece.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!piece) {
      reply.code(404);
      return { error: 'NOT_FOUND' };
    }

    const rules = await prisma.qCRule.findMany({
      where: {
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

    // Las reglas manuales se devuelven como checklist items que la UI muestra
    // como checkboxes. La autoría manual va en `qcChecklistJson` cuando se aprueba.
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
