import { useState } from 'react';
import {
  type AudiencePreset,
  useAudiencePresets,
  useBoost,
  useSpendSummary,
} from '../api/dashboard.js';

const PRESETS = [
  { label: '1€/día · 3 días', daily: 1, days: 3 },
  { label: '2€/día · 5 días', daily: 2, days: 5 },
];

/**
 * Panel de boost para una pieza ya publicada.
 * Verifica el kill switch en vivo (5€/día, 150€/mes) antes de permitir confirmar.
 */
export function BoostPanel({
  contentPieceId,
  alreadyBoosted,
}: {
  contentPieceId: string;
  alreadyBoosted: boolean;
}) {
  const { data: spend } = useSpendSummary();
  const { data: presetsData } = useAudiencePresets();
  const boost = useBoost();

  const [daily, setDaily] = useState(1);
  const [days, setDays] = useState(3);
  const [objective, setObjective] = useState<
    'REACH' | 'VIDEO_VIEWS' | 'TRAFFIC' | 'CONVERSIONS' | 'FOLLOWERS'
  >('VIDEO_VIEWS');
  const [audience, setAudience] = useState<AudiencePreset | null>(null);

  if (!presetsData) {
    return <p className="text-xs text-qyro-text-muted">Cargando presets…</p>;
  }
  const total = daily * days;
  const remainingDaily = spend
    ? spend.daily.capEur - spend.daily.spentEur - spend.daily.committedEur
    : 5;
  const wouldExceed = total > remainingDaily;

  if (alreadyBoosted) {
    return (
      <p className="rounded-card-sm bg-qyro-purple-500/10 px-3 py-2 text-xs text-qyro-purple-500">
        Ya tiene boost activo.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setDaily(p.daily);
              setDays(p.days);
            }}
            className={`rounded-pill border px-3 py-1 text-xs ${
              daily === p.daily && days === p.days
                ? 'border-qyro-blue-500 bg-qyro-blue-500/10 text-qyro-blue-600'
                : 'border-qyro-border-subtle text-qyro-text-muted hover:border-qyro-blue-500/30'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="€/día">
          <input
            type="number"
            min={0.5}
            max={5}
            step={0.5}
            value={daily}
            onChange={(e) => setDaily(Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Días">
          <input
            type="number"
            min={1}
            max={14}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Total">
          <p className="input bg-qyro-bg-canvas">{total.toFixed(2)} €</p>
        </Field>
      </div>

      <Field label="Objetivo">
        <select
          className="input"
          value={objective}
          onChange={(e) => setObjective(e.target.value as typeof objective)}
        >
          <option value="REACH">Alcance</option>
          <option value="VIDEO_VIEWS">Visualizaciones</option>
          <option value="TRAFFIC">Tráfico</option>
          <option value="CONVERSIONS">Conversiones</option>
          <option value="FOLLOWERS">Seguidores</option>
        </select>
      </Field>

      <Field label="Audiencia">
        <select
          className="input"
          value={audience?.id ?? ''}
          onChange={(e) =>
            setAudience(presetsData.items.find((p) => p.id === e.target.value) ?? null)
          }
        >
          <option value="">— Selecciona —</option>
          {presetsData.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      {wouldExceed && (
        <p className="rounded-card-sm bg-red-50 px-3 py-2 text-xs text-red-700">
          Excede el cap diario. Restante hoy: {remainingDaily.toFixed(2)}€.
        </p>
      )}

      <button
        type="button"
        className="btn-primary text-sm"
        disabled={wouldExceed || !audience || boost.isPending}
        onClick={() =>
          audience &&
          boost.mutate({
            id: contentPieceId,
            dailyBudgetEur: daily,
            durationDays: days,
            objective,
            audiencePresetId: audience.id,
          })
        }
      >
        {boost.isPending ? 'Procesando…' : `Promocionar ${total.toFixed(2)} €`}
      </button>
      {boost.isError && (
        <p className="text-xs text-red-700">Error al crear el boost. Mira los logs.</p>
      )}
      {boost.isSuccess && (
        <p className="rounded-card-sm bg-qyro-green-500/10 px-3 py-2 text-xs text-qyro-green-500">
          Boost encolado. El gasto aparecerá en el dashboard tras la primera reconciliación.
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block text-xs">
      <p className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-qyro-text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}
