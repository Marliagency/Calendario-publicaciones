import clsx from 'clsx';
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
  const { data, isLoading } = useContentPieces({ status: ['IN_REVIEW'] });
  const items = (data?.items ?? []).slice(0, 5);

  return (
    <aside className="card sticky top-20 self-start p-4">
      <h2 className="mb-1 text-sm font-semibold">Pendiente de revisar</h2>
      <p className="mb-3 text-[11px] text-qyro-text-muted">
        Top 5 piezas más recientes. Click para revisar.
      </p>
      {isLoading ? (
        <p className="text-xs text-qyro-text-muted">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="rounded-card-sm bg-qyro-green-500/10 px-3 py-2 text-xs text-qyro-green-500">
          ✓ Todo revisado
        </p>
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
          'flex w-full items-stretch gap-2 rounded-card-sm border p-2 text-left transition-colors',
          active
            ? 'border-qyro-blue-500 bg-qyro-blue-500/5'
            : 'border-qyro-border-subtle hover:bg-qyro-bg-canvas',
        )}
      >
        {piece.variants[0]?.mediaUrl ? (
          <img
            src={piece.variants[0].mediaUrl}
            alt=""
            className="h-16 w-9 shrink-0 rounded-card-sm object-cover"
          />
        ) : (
          <div className="mt-0.5 flex flex-col gap-1">
            {piece.variants.slice(0, 3).map((v) => (
              <PlatformIcon key={v.id} kind={v.kind} size="sm" />
            ))}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-medium leading-tight text-qyro-text-primary">
            {piece.title}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-qyro-text-muted">
            {piece.format}
          </p>
          <div className="mt-1 flex gap-1">
            {piece.variants.slice(0, 3).map((v) => (
              <PlatformIcon key={v.id} kind={v.kind} size="sm" />
            ))}
          </div>
        </div>
      </button>
    </li>
  );
}
