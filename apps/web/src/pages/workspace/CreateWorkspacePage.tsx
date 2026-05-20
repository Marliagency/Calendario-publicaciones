import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api.js';

interface StepOneData {
  name: string;
  slug: string;
  description: string;
}

interface StepTwoData {
  brandColorPrimary: string;
  brandColorSecondary: string;
}

interface StepThreeData {
  defaultTimezone: string;
  dailyBoostCapEur: number;
  monthlyBoostCapEur: number;
}

type AllData = StepOneData & StepTwoData & StepThreeData;

const TIMEZONES = [
  'Europe/Madrid',
  'America/Mexico_City',
  'America/Buenos_Aires',
  'America/Bogota',
  'America/Santiago',
  'UTC',
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function CreateWorkspacePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Partial<AllData>>({
    brandColorPrimary: '#3B82F6',
    brandColorSecondary: '#7C5CFC',
    defaultTimezone: 'Europe/Madrid',
    dailyBoostCapEur: 5,
    monthlyBoostCapEur: 150,
  });

  const createMutation = useMutation({
    mutationFn: (body: AllData) =>
      api<{ workspace: { slug: string } }>('/api/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      navigate(`/w/${res.workspace.slug}/calendar`, { replace: true });
    },
  });

  function mergeStep(patch: Partial<AllData>) {
    setData((d) => ({ ...d, ...patch }));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-qyro-bg-canvas p-6">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  s <= step
                    ? 'bg-qyro-blue-500 text-white'
                    : 'bg-qyro-border-subtle text-qyro-text-muted'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 w-8 rounded transition-colors ${s < step ? 'bg-qyro-blue-500' : 'bg-qyro-border-subtle'}`}
                />
              )}
            </div>
          ))}
          <span className="ml-3 text-sm text-qyro-text-muted">
            {step === 1 ? 'Identidad' : step === 2 ? 'Branding' : 'Configuración'}
          </span>
        </div>

        <div className="rounded-card bg-qyro-bg-surface p-6 shadow-sm ring-1 ring-qyro-border-subtle">
          {step === 1 && (
            <StepOne
              data={data}
              onNext={(patch) => { mergeStep(patch); setStep(2); }}
              onCancel={() => navigate(-1)}
            />
          )}
          {step === 2 && (
            <StepTwo
              data={data}
              onNext={(patch) => { mergeStep(patch); setStep(3); }}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepThree
              data={data}
              onBack={() => setStep(2)}
              onSubmit={(patch) => {
                const all = { ...data, ...patch } as AllData;
                createMutation.mutate(all);
              }}
              loading={createMutation.isPending}
              error={createMutation.isError ? 'No se pudo crear el workspace. ¿El slug ya existe?' : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StepOne({
  data,
  onNext,
  onCancel,
}: {
  data: Partial<AllData>;
  onNext: (d: StepOneData) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(data.name ?? '');
  const [slug, setSlug] = useState(data.slug ?? '');
  const [description, setDescription] = useState(data.description ?? '');
  const [slugManual, setSlugManual] = useState(false);

  function handleNameChange(v: string) {
    setName(v);
    if (!slugManual) setSlug(slugify(v));
  }

  const valid = name.length >= 1 && /^[a-z0-9-]{2,40}$/.test(slug);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onNext({ name, slug, description });
      }}
    >
      <h2 className="mb-4 text-lg font-semibold">Nuevo workspace</h2>
      <label className="block mb-4">
        <span className="text-sm font-medium text-qyro-text-secondary">Nombre</span>
        <input
          className="mt-1 input w-full"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Ej: QYRO, Agencia Ejemplo"
          required
        />
      </label>
      <label className="block mb-4">
        <span className="text-sm font-medium text-qyro-text-secondary">Slug (URL)</span>
        <input
          className="mt-1 input w-full font-mono text-sm"
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
          placeholder="mi-workspace"
          pattern="[a-z0-9-]{2,40}"
          required
        />
        <p className="mt-1 text-[11px] text-qyro-text-muted">
          Solo minúsculas, números y guiones. Se usará en la URL.
        </p>
      </label>
      <label className="block mb-6">
        <span className="text-sm font-medium text-qyro-text-secondary">Descripción (opcional)</span>
        <textarea
          className="mt-1 input w-full resize-none"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Breve descripción del workspace"
          maxLength={300}
        />
      </label>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancelar</button>
        <button type="submit" disabled={!valid} className="btn-primary">Continuar →</button>
      </div>
    </form>
  );
}

function StepTwo({
  data,
  onNext,
  onBack,
}: {
  data: Partial<AllData>;
  onNext: (d: StepTwoData) => void;
  onBack: () => void;
}) {
  const [primary, setPrimary] = useState(data.brandColorPrimary ?? '#3B82F6');
  const [secondary, setSecondary] = useState(data.brandColorSecondary ?? '#7C5CFC');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext({ brandColorPrimary: primary, brandColorSecondary: secondary }); }}>
      <h2 className="mb-4 text-lg font-semibold">Colores de marca</h2>
      <div className="mb-4 flex items-center gap-4">
        <div
          className="h-16 w-full rounded-card-sm"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
        />
      </div>
      <label className="block mb-4">
        <span className="text-sm font-medium text-qyro-text-secondary">Color principal</span>
        <div className="mt-1 flex items-center gap-2">
          <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-9 cursor-pointer rounded border-0" />
          <input className="input flex-1 font-mono text-sm" value={primary} onChange={(e) => setPrimary(e.target.value)} pattern="^#[0-9a-fA-F]{6}$" />
        </div>
      </label>
      <label className="block mb-6">
        <span className="text-sm font-medium text-qyro-text-secondary">Color secundario</span>
        <div className="mt-1 flex items-center gap-2">
          <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="h-9 w-9 cursor-pointer rounded border-0" />
          <input className="input flex-1 font-mono text-sm" value={secondary} onChange={(e) => setSecondary(e.target.value)} pattern="^#[0-9a-fA-F]{6}$" />
        </div>
      </label>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onBack} className="btn-ghost">← Atrás</button>
        <button type="submit" className="btn-primary">Continuar →</button>
      </div>
    </form>
  );
}

function StepThree({
  data,
  onBack,
  onSubmit,
  loading,
  error,
}: {
  data: Partial<AllData>;
  onBack: () => void;
  onSubmit: (d: StepThreeData) => void;
  loading: boolean;
  error?: string;
}) {
  const [tz, setTz] = useState(data.defaultTimezone ?? 'Europe/Madrid');
  const [daily, setDaily] = useState(data.dailyBoostCapEur ?? 5);
  const [monthly, setMonthly] = useState(data.monthlyBoostCapEur ?? 150);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ defaultTimezone: tz, dailyBoostCapEur: daily, monthlyBoostCapEur: monthly }); }}>
      <h2 className="mb-4 text-lg font-semibold">Configuración</h2>
      <label className="block mb-4">
        <span className="text-sm font-medium text-qyro-text-secondary">Zona horaria</span>
        <select className="mt-1 input w-full" value={tz} onChange={(e) => setTz(e.target.value)}>
          {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-qyro-text-secondary">Cap diario boost (€)</span>
          <input
            type="number"
            className="mt-1 input w-full"
            value={daily}
            min={1}
            max={100}
            step={0.5}
            onChange={(e) => setDaily(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-qyro-text-secondary">Cap mensual boost (€)</span>
          <input
            type="number"
            className="mt-1 input w-full"
            value={monthly}
            min={10}
            max={5000}
            step={5}
            onChange={(e) => setMonthly(Number(e.target.value))}
          />
        </label>
      </div>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>
      )}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onBack} className="btn-ghost" disabled={loading}>← Atrás</button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creando…' : 'Crear workspace'}
        </button>
      </div>
    </form>
  );
}
