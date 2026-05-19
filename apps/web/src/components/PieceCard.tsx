import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import type { ContentPiece, PlatformVariant } from '../api/contentPieces.js';
import { dateUtils } from '../lib/dates.js';
import { PlatformIcon } from './PlatformIcon.js';
import { StatusBadge } from './StatusBadge.js';

/**
 * Tarjeta compacta de pieza en el calendario.
 * Es draggable a través de @dnd-kit usando su id; el contenedor padre decide
 * qué hace con el drop.
 */
export function PieceCard({
  piece,
  variant,
  onClick,
  draggableId,
  size = 'md',
}: {
  piece: ContentPiece;
  variant?: PlatformVariant;
  onClick: () => void;
  draggableId?: string;
  size?: 'sm' | 'md';
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId ?? `piece:${piece.id}:${variant?.id ?? 'none'}`,
    data: { pieceId: piece.id, variantId: variant?.id },
    disabled: !draggableId,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const boostBadge = piece.boostBudgetEur && Number(piece.boostBudgetEur) > 0;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={clsx(
        'group relative cursor-grab select-none rounded-card-sm border bg-white shadow-soft transition',
        size === 'sm' ? 'p-2 text-[11px]' : 'p-3 text-xs',
        isDragging
          ? 'z-10 border-qyro-blue-500 opacity-90 shadow-elevated'
          : 'border-qyro-border-subtle hover:border-qyro-blue-500/40',
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          if (isDragging) return;
          e.stopPropagation();
          onClick();
        }}
        className="flex w-full items-stretch gap-2 text-left"
      >
        {(() => {
          const thumb = variant?.mediaUrl ?? piece.variants[0]?.mediaUrl;
          return thumb ? (
            <img
              src={thumb}
              alt=""
              className={clsx(
                'shrink-0 rounded-card-sm object-cover',
                size === 'sm' ? 'h-10 w-6' : 'h-14 w-8',
              )}
            />
          ) : null;
        })()}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1">
            {variant ? (
              <PlatformIcon kind={variant.kind} size="sm" />
            ) : (
              piece.variants
                .slice(0, 3)
                .map((v) => <PlatformIcon key={v.id} kind={v.kind} size="sm" />)
            )}
            {variant?.scheduledAt && (
              <span className="ml-1 text-[10px] tabular-nums text-qyro-text-muted">
                {dateUtils.fmtTime(variant.scheduledAt)}
              </span>
            )}
            {boostBadge && (
              <span className="ml-auto rounded bg-qyro-purple-500/15 px-1 text-[9px] font-bold uppercase text-qyro-purple-500">
                €
              </span>
            )}
          </div>
          <p className="line-clamp-2 font-medium leading-tight text-qyro-text-primary">
            {piece.title}
          </p>
          {size === 'md' && (
            <div className="mt-1.5">
              <StatusBadge status={piece.status} size="sm" />
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
