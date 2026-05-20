import { useState } from 'react';
import { useWorkspace } from '../../lib/workspace.js';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '../../api/workspaces.js';

export function WorkspaceSettingsPage() {
  const { slug, workspace } = useWorkspace();

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold">Ajustes del workspace</h1>
        <p className="mt-1 text-sm text-qyro-text-muted">{workspace?.name}</p>
      </div>

      <WorkspaceInfo workspace={workspace} />
      <ApiKeysSection slug={slug} />
    </div>
  );
}

function WorkspaceInfo({ workspace }: { workspace: { name: string; slug: string; brandColorPrimary: string; brandColorSecondary: string; description: string | null } | undefined }) {
  if (!workspace) return null;
  return (
    <section className="card space-y-4">
      <h2 className="text-sm font-semibold">Identidad</h2>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-qyro-text-muted">Nombre</p>
          <p className="mt-0.5 font-medium">{workspace.name}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-qyro-text-muted">Slug</p>
          <p className="mt-0.5 font-mono text-qyro-text-muted">{workspace.slug}</p>
        </div>
        {workspace.description && (
          <div className="col-span-2">
            <p className="text-[11px] uppercase tracking-wide text-qyro-text-muted">Descripción</p>
            <p className="mt-0.5 text-qyro-text-muted">{workspace.description}</p>
          </div>
        )}
        <div>
          <p className="text-[11px] uppercase tracking-wide text-qyro-text-muted">Colores</p>
          <div className="mt-1 flex gap-2">
            <span
              className="h-5 w-5 rounded-full border border-qyro-border-subtle"
              style={{ background: workspace.brandColorPrimary }}
              title={workspace.brandColorPrimary}
            />
            <span
              className="h-5 w-5 rounded-full border border-qyro-border-subtle"
              style={{ background: workspace.brandColorSecondary }}
              title={workspace.brandColorSecondary}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ApiKeysSection({ slug }: { slug: string }) {
  const { data, isLoading } = useApiKeys(slug);
  const createKey = useCreateApiKey(slug);
  const revokeKey = useRevokeApiKey(slug);
  const [newKeyName, setNewKeyName] = useState('Estudio Creativo');
  const [revealedKey, setRevealedKey] = useState<{ id: string; raw: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const result = await createKey.mutateAsync(newKeyName);
    setRevealedKey({ id: result.id, raw: result.raw });
    setNewKeyName('Estudio Creativo');
  }

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-sm font-semibold">API Keys del workspace</h2>
        <p className="mt-1 text-xs text-qyro-text-muted">
          El Estudio Creativo usa estas keys en el header{' '}
          <code className="rounded bg-qyro-bg-canvas px-1 font-mono text-[11px]">X-Service-API-Key</code>{' '}
          para llamar a <code className="rounded bg-qyro-bg-canvas px-1 font-mono text-[11px]">POST /api/v1/content-pieces/ingest</code>.
          El raw key se muestra una sola vez al crear.
        </p>
      </div>

      {revealedKey && (
        <div className="rounded-card-sm border border-qyro-green-500/30 bg-qyro-green-500/5 p-3">
          <p className="mb-1 text-xs font-semibold text-qyro-green-500">Key creada — cópiala ahora, no se mostrará de nuevo.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-qyro-bg-canvas px-2 py-1.5 font-mono text-xs text-qyro-text-primary">
              {revealedKey.raw}
            </code>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(revealedKey.raw); }}
              className="btn-ghost text-xs"
            >
              Copiar
            </button>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="btn-ghost text-xs"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-qyro-text-muted">Cargando…</p>
      ) : (data?.keys ?? []).length === 0 ? (
        <p className="text-xs text-qyro-text-muted">Sin keys activas.</p>
      ) : (
        <ul className="divide-y divide-qyro-border-subtle">
          {(data?.keys ?? []).map((key) => (
            <li key={key.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium">{key.name}</p>
                <p className="mt-0.5 font-mono text-[11px] text-qyro-text-muted">
                  {key.prefix}••••••••••••••••
                </p>
                <p className="mt-0.5 text-[10px] text-qyro-text-muted">
                  {key.lastUsedAt
                    ? `Último uso ${new Date(key.lastUsedAt).toLocaleDateString('es-ES')}`
                    : 'Nunca usada'} · Creada {new Date(key.createdAt).toLocaleDateString('es-ES')}
                </p>
              </div>
              {confirmRevoke === key.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">¿Revocar?</span>
                  <button
                    type="button"
                    onClick={() => { revokeKey.mutate(key.id); setConfirmRevoke(null); }}
                    className="btn-ghost text-xs text-red-600 hover:bg-red-50"
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(null)}
                    className="btn-ghost text-xs"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(key.id)}
                  className="btn-ghost text-xs text-red-600 hover:bg-red-50"
                >
                  Revocar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="flex items-end gap-2 border-t border-qyro-border-subtle pt-4">
        <label className="flex-1">
          <span className="block text-xs font-medium text-qyro-text-secondary mb-1">Nueva key</span>
          <input
            className="input w-full text-sm"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Nombre (ej: Estudio Creativo)"
            required
          />
        </label>
        <button
          type="submit"
          className="btn-primary text-sm"
          disabled={createKey.isPending}
        >
          {createKey.isPending ? 'Creando…' : 'Crear key'}
        </button>
      </form>
    </section>
  );
}
