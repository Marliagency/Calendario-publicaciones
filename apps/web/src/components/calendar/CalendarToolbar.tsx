import clsx from 'clsx';
import { dateUtils } from '../../lib/dates.js';

export type CalendarView = 'week' | 'month' | 'kanban';

export function CalendarToolbar({
  view,
  setView,
  cursor,
  setCursor,
}: {
  view: CalendarView;
  setView: (v: CalendarView) => void;
  cursor: Date;
  setCursor: (d: Date) => void;
}) {
  function nav(dir: -1 | 0 | 1) {
    if (dir === 0) return setCursor(new Date());
    if (view === 'week') {
      setCursor(dateUtils.addDays(cursor, dir * 7));
    } else if (view === 'month') {
      setCursor(dir > 0 ? dateUtils.addMonths(cursor, 1) : dateUtils.subMonths(cursor, 1));
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => nav(-1)} className="btn-ghost text-sm">
          ←
        </button>
        <button type="button" onClick={() => nav(0)} className="btn-ghost text-sm">
          Hoy
        </button>
        <button type="button" onClick={() => nav(1)} className="btn-ghost text-sm">
          →
        </button>
        <h2 className="ml-2 text-base font-semibold capitalize text-qyro-text-primary">
          {dateUtils.fmtTitle(cursor)}
        </h2>
      </div>
      <div className="flex items-center gap-1 rounded-pill bg-qyro-bg-canvas p-1">
        {(['week', 'month', 'kanban'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={clsx(
              'rounded-pill px-3 py-1 text-xs font-medium transition-colors',
              view === v
                ? 'bg-white text-qyro-text-primary shadow-soft'
                : 'text-qyro-text-muted hover:text-qyro-text-primary',
            )}
          >
            {v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Kanban'}
          </button>
        ))}
      </div>
    </div>
  );
}
