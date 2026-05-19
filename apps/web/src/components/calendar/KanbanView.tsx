import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import type { ContentPiece, ContentStatus } from '../../api/contentPieces.js';
import { PieceCard } from '../PieceCard.js';

const COLUMNS: { status: ContentStatus; label: string }[] = [
  { status: 'DRAFT', label: 'Borrador' },
  { status: 'IN_REVIEW', label: 'En revisión' },
  { status: 'APPROVED', label: 'Aprobada' },
  { status: 'SCHEDULED', label: 'Programada' },
  { status: 'PUBLISHED', label: 'Publicada' },
];

export function KanbanView({
  pieces,
  onPick,
}: {
  pieces: ContentPiece[];
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {COLUMNS.map((col) => {
        const items = pieces.filter((p) => p.status === col.status);
        return (
          <Column
            key={col.status}
            status={col.status}
            label={col.label}
            items={items}
            onPick={onPick}
          />
        );
      })}
    </div>
  );
}

function Column({
  status,
  label,
  items,
  onPick,
}: {
  status: ContentStatus;
  label: string;
  items: ContentPiece[];
  onPick: (id: string) => void;
}) {
  const id = `kanban:${status}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { kanbanStatus: status } });
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'card flex min-h-[300px] flex-col gap-2 p-3 transition-colors',
        isOver && 'border-qyro-blue-500 bg-qyro-blue-500/5',
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-qyro-text-muted">
          {label}
        </h3>
        <span className="rounded-pill bg-qyro-bg-canvas px-2 text-[10px] font-medium text-qyro-text-muted">
          {items.length}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((p) => (
          <PieceCard
            key={p.id}
            piece={p}
            onClick={() => onPick(p.id)}
            draggableId={`piece:${p.id}`}
          />
        ))}
        {items.length === 0 && (
          <p className="rounded-card-sm border border-dashed border-qyro-border-subtle p-3 text-center text-[11px] text-qyro-text-muted">
            Vacío
          </p>
        )}
      </div>
    </div>
  );
}
