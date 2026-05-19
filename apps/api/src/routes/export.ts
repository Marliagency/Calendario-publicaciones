import { prisma } from '@qyro/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

/**
 * Export endpoints (Fase 7):
 *   - GET /export/monthly-report.csv?month=YYYY-MM  → CSV con totales por pieza
 *   - GET /export/monthly-report.html?month=YYYY-MM → HTML imprimible (printer → PDF)
 *
 * Nota: el brief mencionaba PDF + Excel via skills `pdf` y `xlsx` (no disponibles
 * en este entorno, ADR 0001). Elegimos CSV (compatible con Excel) + HTML imprimible
 * que el navegador convierte a PDF con Ctrl+P. Funcionalmente equivalente sin deps.
 */
export default async function exportRoutes(app: FastifyInstance) {
  const querySchema = z.object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
  });

  app.get('/export/monthly-report.csv', { preHandler: [app.requireUser] }, async (req, reply) => {
    const { month } = querySchema.parse(req.query);
    const { from, to, label } = monthRange(month);

    const variants = await fetchMonthlyData(from, to);

    const rows = [
      [
        'piece_id',
        'title',
        'platform',
        'published_at',
        'impressions',
        'reach',
        'likes',
        'comments',
        'shares',
        'saves',
        'video_views',
        'avg_watch_time_s',
        'spend_cents',
      ],
      ...variants.map((v) => {
        const organic = pickLatest(v.metrics, 'ORGANIC');
        const paid = pickLatest(v.metrics, 'PAID');
        return [
          v.contentPieceId,
          escapeCsv(v.contentPiece.title),
          v.kind,
          v.publishedAt?.toISOString() ?? '',
          organic?.impressions ?? 0,
          organic?.reach ?? 0,
          organic?.likes ?? 0,
          organic?.comments ?? 0,
          organic?.shares ?? 0,
          organic?.saves ?? 0,
          organic?.video_views ?? 0,
          organic?.avg_watch_time_s ?? 0,
          paid?.spend_cents ?? 0,
        ];
      }),
    ];

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="qyro-report-${label}.csv"`);
    return rows.map((r) => r.join(',')).join('\n');
  });

  app.get('/export/monthly-report.html', { preHandler: [app.requireUser] }, async (req, reply) => {
    const { month } = querySchema.parse(req.query);
    const { from, to, label } = monthRange(month);
    const variants = await fetchMonthlyData(from, to);

    const tableRows = variants
      .map((v) => {
        const organic = pickLatest(v.metrics, 'ORGANIC');
        const paid = pickLatest(v.metrics, 'PAID');
        return `<tr>
          <td>${escapeHtml(v.contentPiece.title)}</td>
          <td>${v.kind}</td>
          <td>${v.publishedAt ? v.publishedAt.toISOString().slice(0, 10) : '—'}</td>
          <td>${organic?.impressions ?? 0}</td>
          <td>${organic?.likes ?? 0}</td>
          <td>${organic?.shares ?? 0}</td>
          <td>${((paid?.spend_cents ?? 0) / 100).toFixed(2)}€</td>
        </tr>`;
      })
      .join('');

    const html = `<!doctype html>
<html lang="es-ES"><head><meta charset="utf-8"/>
<title>QYRO — Informe ${label}</title>
<style>
  body { font-family: Inter, -apple-system, system-ui, sans-serif; color: #0B1220; padding: 32px; }
  h1 { color: #3B82F6; margin: 0 0 8px; }
  .muted { color: #64748B; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 12px; }
  th, td { border-bottom: 1px solid #E5E7EB; padding: 8px 10px; text-align: left; }
  th { background: #F4F6FB; font-weight: 600; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <h1>QYRO — Informe mensual</h1>
  <p class="muted">Periodo: ${label} · ${variants.length} variantes publicadas</p>
  <table>
    <thead><tr>
      <th>Pieza</th><th>Plataforma</th><th>Publicada</th><th>Impr.</th><th>Likes</th><th>Shares</th><th>Gasto</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <p class="muted" style="margin-top: 32px;">Imprime con Ctrl+P → "Guardar como PDF" para archivo.</p>
</body></html>`;

    reply.header('Content-Type', 'text/html; charset=utf-8');
    return html;
  });
}

function monthRange(month: string | undefined) {
  const now = new Date();
  const [y, m] = month
    ? month.split('-').map(Number)
    : [now.getUTCFullYear(), now.getUTCMonth() + 1];
  const from = new Date(Date.UTC(y as number, (m as number) - 1, 1));
  const to = new Date(Date.UTC(y as number, m as number, 1));
  const label = `${y}-${String(m).padStart(2, '0')}`;
  return { from, to, label };
}

async function fetchMonthlyData(from: Date, to: Date) {
  return prisma.platformVariant.findMany({
    where: { publishedAt: { gte: from, lt: to } },
    include: {
      contentPiece: { select: { title: true } },
      metrics: { orderBy: { fetchedAt: 'desc' } },
    },
    orderBy: { publishedAt: 'desc' },
  });
}

function pickLatest(
  metrics: { kind: string; dataJson: unknown }[],
  kind: 'ORGANIC' | 'PAID',
): Record<string, number> | null {
  const m = metrics.find((mm) => mm.kind === kind);
  return m ? (m.dataJson as Record<string, number>) : null;
}

function escapeCsv(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
