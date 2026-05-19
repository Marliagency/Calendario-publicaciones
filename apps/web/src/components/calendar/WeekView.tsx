import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import type { ContentPiece, PlatformVariant } from '../../api/contentPieces.js';
import { dateUtils } from '../../lib/dates.js';
import { PieceCard } from '../PieceCard.js';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08–21h

interface Slot {
  piece: ContentPiece;
  variant: PlatformVariant;
}

export function WeekView({
  cursor,
  pieces,
  onPick,
}: {
  cursor: Date;
  pieces: ContentPiece[];
  onPick: (id: string) => void;
}) {
  const days = dateUtils.weekDays(cursor);
  const slotsByKey = bucketByDayHour(pieces);
  const unscheduled = collectUnscheduled(pieces);

  return (
    <div className="space-y-3">
      {unscheduled.length > 0 && <UnscheduledTray slots={unscheduled} onPick={onPick} />}
      <div className="overflow-x-auto">
        <div className="min-w-[840px] rounded-card border border-qyro-border-subtle bg-white">
          <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-qyro-border-subtle">
            <div />
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className={clsx(
                  'border-l border-qyro-border-subtle px-2 py-2 text-center',
                  dateUtils.isToday(d) && 'bg-qyro-blue-500/5',
                )}
              >
                <p className="text-[10px] uppercase tracking-wide text-qyro-text-muted">
                  {dateUtils.fmt(d, 'EEE')}
                </p>
                <p
                  className={clsx(
                    'mt-0.5 text-sm font-semibold',
                    dateUtils.isToday(d) ? 'text-qyro-blue-500' : 'text-qyro-text-primary',
                  )}
                >
                  {dateUtils.fmt(d, 'd')}
                </p>
              </div>
            ))}
          </div>
          {HOURS.map((h) => (
            <div
              key={h}
              className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-qyro-border-subtle/60 last:border-0"
            >
              <div className="border-r border-qyro-border-subtle/60 px-2 py-2 text-right text-[10px] tabular-nums text-qyro-text-muted">
                {String(h).padStart(2, '0')}:00
              </div>
              {days.map((d) => (
                <CellSlot
                  key={`${d.toISOString()}-${h}`}
                  day={d}
                  hour={h}
                  items={slotsByKey.get(`${d.toDateString()}-${h}`) ?? []}
                  onPick={onPick}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CellSlot({
  day,
  hour,
  items,
  onPick,
}: {
  day: Date;
  hour: number;
  items: Slot[];
  onPick: (id: string) => void;
}) {
  const slotDate = new Date(day);
  slotDate.setHours(hour, 0, 0, 0);
  const id = `slot:${slotDate.toISOString()}`;
  const { setNodeRef, isOver } = useDroppable({ id, data: { slotDate: slotDate.toISOString() } });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'min-h-[48px] border-l border-qyro-border-subtle/60 p-1 transition-colors',
        isOver ? 'bg-qyro-blue-500/10' : 'hover:bg-qyro-bg-canvas',
      )}
    >
      <div className="space-y-1">
        {items.map(({ piece, variant }) => (
          <PieceCard
            key={variant.id}
            piece={piece}
            variant={variant}
            onClick={() => onPick(piece.id)}
            draggableId={`variant:${variant.id}`}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}

function UnscheduledTray({ slots, onPick }: { slots: Slot[]; onPick: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'slot:unscheduled' });
  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'card flex flex-wrap items-start gap-2 p-3 transition-colors',
        isOver && 'border-qyro-blue-500 bg-qyro-blue-500/5',
      )}
    >
      <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-qyro-text-muted">
        Sin programar ({slots.length})
      </span>
      {slots.map(({ piece, variant }) => (
        <PieceCard
          key={variant.id}
          piece={piece}
          variant={variant}
          onClick={() => onPick(piece.id)}
          draggableId={`variant:${variant.id}`}
          size="sm"
        />
      ))}
    </div>
  );
}

function bucketByDayHour(pieces: ContentPiece[]): Map<string, Slot[]> {
  const map = new Map<string, Slot[]>();
  for (const piece of pieces) {
    for (const v of piece.variants) {
      if (!v.scheduledAt) continue;
      const d = dateUtils.parseISO(v.scheduledAt);
      const key = `${d.toDateString()}-${d.getHours()}`;
      const list = map.get(key) ?? [];
      list.push({ piece, variant: v });
      map.set(key, list);
    }
  }
  return map;
}

function collectUnscheduled(pieces: ContentPiece[]): Slot[] {
  const out: Slot[] = [];
  for (const piece of pieces) {
    if (!['IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'DRAFT'].includes(piece.status)) continue;
    for (const v of piece.variants) {
      if (!v.scheduledAt) out.push({ piece, variant: v });
    }
  }
  return out;
}
