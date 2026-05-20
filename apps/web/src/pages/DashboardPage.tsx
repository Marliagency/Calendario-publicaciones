import { Link } from 'react-router-dom';
import { useDashboard, useRefreshMetrics, useSpendSummary } from '../api/dashboard.js';
import { useWorkspace } from '../lib/workspace.js';

export function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const { data: spend } = useSpendSummary();
  const refresh = useRefreshMetrics();
  const { slug } = useWorkspace();

  if (isLoading || !data) {
    return (
      <p className="mx-auto max-w-5xl px-6 py-10 text-sm text-qyro-text-muted">Cargando…</p>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-xs text-qyro-text-muted">
            Métricas agregadas. Datos mockeados hasta que las apps Meta/TT estén aprobadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/w/${slug}/calendar`} className="btn-ghost text-sm">
            Calendario
          </Link>
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => refresh.mutate()}
            disabled={refresh.isPending}
          >
            {refresh.isPending ? 'Refrescando…' : 'Refrescar métricas'}
          </button>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Piezas totales" value={String(data.total)} />
        <Card
          label="Ratio aprobación"
          value={`${Math.round(data.approvalRate * 100)}%`}
          sub={`${data.byStatus.APPROVED ?? 0} aprobadas + ${data.byStatus.SCHEDULED ?? 0} programadas`}
        />
        <Card
          label="Tiempo medio QC"
          value={`${Math.round(data.avgReviewMin)} min`}
          sub="desde IN_REVIEW hasta decisión"
        />
        <Card
          label="Hold Rate medio"
          value={`${Math.round(data.holdRate * 100)}%`}
          sub="watch time / duración"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="card">
          <h3 className="text-sm font-semibold">Estado actual del pipeline</h3>
          <ul className="mt-3 space-y-1.5 text-sm">
            {Object.entries(data.byStatus).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between">
                <span className="text-qyro-text-muted">{k}</span>
                <span className="font-semibold">{v}</span>
              </li>
            ))}
          </ul>
          {data.failedRate > 0 && (
            <p className="mt-3 rounded-card-sm bg-red-50 px-3 py-2 text-xs text-red-700">
              {Math.round(data.failedRate * 100)}% de las piezas han fallado al publicar.
            </p>
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold">Top posts por engagement</h3>
          {data.topPosts.length === 0 ? (
            <p className="mt-3 text-xs text-qyro-text-muted">
              Aún sin métricas. Refresca después de publicar algo.
            </p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {data.topPosts.map((p, i) => (
                <li key={p.id} className="flex items-start gap-2">
                  <span className="w-5 shrink-0 text-qyro-text-muted tabular-nums">{i + 1}.</span>
                  <Link
                    to={`/w/${slug}/piece/${p.id}`}
                    className="flex-1 line-clamp-2 hover:text-qyro-blue-600"
                  >
                    {p.title}
                  </Link>
                  <span className="text-xs tabular-nums text-qyro-text-muted">
                    {p.engagement}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {spend && (
        <section className="card">
          <h3 className="text-sm font-semibold">Kill switch de gasto en boost</h3>
          <p className="mt-1 text-xs text-qyro-text-muted">
            Caps duros. El sistema rechaza boosts que superen estos límites.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SpendBar
              label="Hoy"
              spent={spend.daily.spentEur}
              committed={spend.daily.committedEur}
              cap={spend.daily.capEur}
            />
            <SpendBar
              label="Este mes"
              spent={spend.monthly.spentEur}
              committed={spend.monthly.committedEur}
              cap={spend.monthly.capEur}
            />
          </div>
        </section>
      )}

      <section className="card">
        <h3 className="text-sm font-semibold">Exportar informe mensual</h3>
        <p className="mt-1 text-xs text-qyro-text-muted">
          CSV abre directamente en Excel. HTML imprimible → "Guardar como PDF".
        </p>
        <div className="mt-3 flex gap-2">
          <a
            className="btn-ghost text-sm"
            href={`/api/v1/export/monthly-report.csv?month=${currentMonth()}`}
          >
            Descargar CSV
          </a>
          <a
            className="btn-ghost text-sm"
            target="_blank"
            rel="noreferrer"
            href={`/api/v1/export/monthly-report.html?month=${currentMonth()}`}
          >
            Abrir HTML imprimible
          </a>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <p className="text-[11px] uppercase tracking-wide text-qyro-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-qyro-text-muted">{sub}</p>}
    </div>
  );
}

function SpendBar({
  label,
  spent,
  committed,
  cap,
}: {
  label: string;
  spent: number;
  committed: number;
  cap: number;
}) {
  const used = spent + committed;
  const pct = Math.min(100, (used / cap) * 100);
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-qyro-amber-500' : 'bg-qyro-green-500';
  return (
    <div>
      <div className="mb-1 flex items-end justify-between text-xs">
        <span className="text-qyro-text-muted">{label}</span>
        <span className="tabular-nums">
          {used.toFixed(2)} € / {cap.toFixed(2)} €
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-qyro-bg-canvas">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[10px] text-qyro-text-muted">
        Gastado {spent.toFixed(2)}€ · Comprometido {committed.toFixed(2)}€
      </p>
    </div>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
