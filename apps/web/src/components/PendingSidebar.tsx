import clsx from 'clsx';
import { useState } from 'react';
import { useContentPieces } from '../api/contentPieces.js';
import type { ContentPiece } from '../api/contentPieces.js';
import { PlatformIcon } from './PlatformIcon.js';

export function PendingSidebar({
  onPick,
  activeId,
}: {
  onPick: (id: string) => void;
  activeId: string | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useContentPieces({ status: ['IN_REVIEW'], limit: 100 });

  const allItems = data?.items ?? [];
  const filtered = search.trim()
    ? allItems.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : allItems;
  const items = showAll ? filtered : filtered.slice(0, 5);

  return (
    <aside className="card sticky top-20 self-start space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Pendiente de revisar</h2>
        {allItems.length > 0 && (
          <span className="rounded-full bg-qyro-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            {allItems.length}
          </span>
        )}
      </div>

      {allItems.length > 3 && (
        <div className="relative">
          <svg
            className="absolute left-2.5 top-2 h-3.5 w-3.5 text-qyro-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-card-sm border border-qyro-border-subtle bg-qyro-bg-canvas py-1.5 pl-7 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-qyro-blue-500"
          />
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-qyro-text-muted">Cargando…</p>
      ) : items.length === 0 && allItems.length === 0 ? (
        <p className="rounded-card-sm bg-qyro-green-500/10 px-3 py-2 text-xs text-qyro-green-500">
          ✓ Todo revisado
        </p>
      ) : items.length === 0 ? (
        <p className="text-xs text-qyro-text-muted">Sin resultados para "{search}"</p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <PendingItem
              key={p.id}
              piece={p}
              active={p.id === activeId}
              onPick={() => onPick(p.id)}
            />
          ))}
        </ul>
      )}

      {filtered.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full text-center text-[11px] text-qyro-blue-500 hover:underline"
        >
          {showAll ? 'Mostrar menos' : `Ver ${filtered.length - 5} más`}
        </button>
      )}
    </aside>
  );
}

function PendingItem({
  piece,
  active,
  onPick,
}: {
  piece: ContentPiece;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className={clsx(
          'flex w-full items-start gap-2 rounded-card-sm border p-2 text-left transition-colors',
          active
            ? 'border-qyro-blue-500 bg-qyro-blue-500/5'
            : 'border-qyro-border-subtle hover:bg-qyro-bg-canvas',
        )}
      >
        <div className="mt-0.5 flex flex-col gap-1">
          {piece.variants.slice(0, 3).map((v) => (
            <PlatformIcon key={v.id} kind={v.kind} size="sm" />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-medium leading-tight text-qyro-text-primary">
            {piece.title}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-qyro-text-muted">
            {piece.format}
          </p>
        </div>
      </button>
    </li>
  );
}
