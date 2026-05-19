import { prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';
import { metricsQueue } from '../queues.js';

/**
 * Dashboard endpoints (Fase 7):
 *   - GET  /dashboard          → cards agregadas + top posts + hook score promedio
 *   - POST /metrics/refresh    → encola job manual de pull de métricas
 */
export default async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard', { preHandler: [app.requireUser] }, async () => {
    const [counts, audit, recentPublished, recentMetrics] = await Promise.all([
      prisma.contentPiece.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.auditLog.findMany({
        where: { contentPieceId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.contentPiece.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { variants: true },
      }),
      prisma.metric.findMany({
        orderBy: { fetchedAt: 'desc' },
        take: 200,
        include: { platformVariant: { include: { contentPiece: true } } },
      }),
    ]);

    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
    const total = counts.reduce((acc, c) => acc + c._count._all, 0);

    const approved =
      (byStatus.APPROVED ?? 0) + (byStatus.SCHEDULED ?? 0) + (byStatus.PUBLISHED ?? 0);
    const rejected = byStatus.REJECTED ?? 0;
    const approvalRate = total > 0 ? approved / total : 0;

    // tiempo medio en QC: IN_REVIEW → (APPROVED|SCHEDULED|REJECTED|CHANGES_REQUESTED).
    const inReviewLogs = audit.filter((a) => a.toStatus === 'IN_REVIEW');
    const decisions = audit.filter((a) =>
      ['APPROVED', 'SCHEDULED', 'REJECTED', 'CHANGES_REQUESTED'].includes(a.toStatus ?? ''),
    );
    const reviewDurations: number[] = [];
    for (const d of decisions) {
      const matching = inReviewLogs.find(
        (a) => a.contentPieceId === d.contentPieceId && a.createdAt < d.createdAt,
      );
      if (matching) {
        reviewDurations.push(d.createdAt.getTime() - matching.createdAt.getTime());
      }
    }
    const avgReviewMin =
      reviewDurations.length > 0
        ? reviewDurations.reduce((a, b) => a + b, 0) / reviewDurations.length / 60_000
        : 0;

    // % piezas que fallaron al publicar
    const failedRate = total > 0 ? (byStatus.FAILED ?? 0) / total : 0;

    // Top posts por engagement organic (likes + comments + shares).
    const engagementByPiece = new Map<string, number>();
    for (const m of recentMetrics) {
      if (m.kind !== 'ORGANIC') continue;
      const data = m.dataJson as {
        likes?: number;
        comments?: number;
        shares?: number;
        saves?: number;
      };
      const score =
        (data.likes ?? 0) + (data.comments ?? 0) + (data.shares ?? 0) + (data.saves ?? 0);
      const pid = m.platformVariant.contentPieceId;
      engagementByPiece.set(pid, (engagementByPiece.get(pid) ?? 0) + score);
    }
    const top = recentPublished
      .map((p) => ({
        id: p.id,
        title: p.title,
        engagement: engagementByPiece.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);

    // Hook Score / Hold Rate promedio (proxy: avg_watch_time_s / duration_s).
    const watchScores: number[] = [];
    for (const m of recentMetrics) {
      if (m.kind !== 'ORGANIC') continue;
      const data = m.dataJson as { avg_watch_time_s?: number };
      const dur = m.platformVariant.durationS ?? 0;
      if (dur > 0 && data.avg_watch_time_s) {
        watchScores.push(Math.min(1, data.avg_watch_time_s / dur));
      }
    }
    const holdRate =
      watchScores.length > 0 ? watchScores.reduce((a, b) => a + b, 0) / watchScores.length : 0;

    return {
      total,
      byStatus,
      approvalRate,
      avgReviewMin,
      failedRate,
      holdRate,
      topPosts: top,
    };
  });

  app.post('/metrics/refresh', { preHandler: [app.requireUser] }, async () => {
    const job = await metricsQueue().add('metrics-pull', {});
    return { jobId: job.id };
  });
}
