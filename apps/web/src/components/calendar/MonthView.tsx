import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import type { ContentPiece, PlatformVariant } from '../../api/contentPieces.js';
import { dateUtils } from '../../lib/dates.js';
import { PieceCard } from '../PieceCard.js';

export function MonthView({
  cursor,
  pieces,
  onPick,
}: {
  cursor: Date;
  pieces: ContentPiece[];
  onPick: (id: string) => void;
}) {
  const days = dateUtils.monthDays(cursor);
  const byDay = bucketByDay(pieces);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[840px] overflow-hidden rounded-card border border-qyro-border-subtle bg-white">
        <div className="grid grid-cols-7 border-b border-qyro-border-subtle bg-qyro-bg-canvas">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[10px] uppercase tracking-wide text-qyro-text-muted"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const isCurrentMonth = day.getMonth() === cursor.getMonth();
            return (
              <DayCell
                key={day.toISOString()}
                day={day}
                items={byDay.get(day.toDateString()) ?? []}
                isCurrentMonth={isCurrentMonth}
                onPick={onPick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayCell({
  day,
  items,
  isCurrentMonth,
  onPick,
}: {
  day: Date;
  items: { piece: ContentPiece; variant: PlatformVariant }[];
  isCurrentMonth: boolean;
  onPick: (id: string) => void;
}) {
  const slotDate = new Date(day);
  slotDate.setHours(12, 0, 0, 0);
  const id = `slot:${slotDate.toISOString()}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { slotDate: slotDate.toISOString() } });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'min-h-[112px] border-b border-r border-qyro-border-subtle/60 p-1.5 transition-colors',
        !isCurrentMonth && 'bg-qyro-bg-canvas/50 opacity-60',
        dateUtils.isToday(day) && 'bg-qyro-blue-500/5',
        isOver && 'bg-qyro-blue-500/10',
      )}
    >
      <p
        className={clsx(
          'mb-1 text-xs tabular-nums',
          dateUtils.isToday(day) ? 'font-bold text-qyro-blue-500' : 'text-qyro-text-muted',
        )}
      >
        {dateUtils.fmt(day, 'd')}
      </p>
      <div className="space-y-1">
        {items.slice(0, 3).map(({ piece, variant }) => (
          <PieceCard
            key={variant.id}
            piece={piece}
            variant={variant}
            onClick={() => onPick(piece.id)}
            draggableId={`variant:${variant.id}`}
            size="sm"
          />
        ))}
        {items.length > 3 && (
          <p className="text-[10px] text-qyro-text-muted">+{items.length - 3} más</p>
        )}
      </div>
    </div>
  );
}

function bucketByDay(pieces: ContentPiece[]) {
  const map = new Map<string, { piece: ContentPiece; variant: PlatformVariant }[]>();
  for (const piece of pieces) {
    for (const v of piece.variants) {
      if (!v.scheduledAt) continue;
      const d = dateUtils.parseISO(v.scheduledAt);
      const key = d.toDateString();
      const list = map.get(key) ?? [];
      list.push({ piece, variant: v });
      map.set(key, list);
    }
  }
  return map;
}
