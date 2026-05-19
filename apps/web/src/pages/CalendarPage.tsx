import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApprove, useContentPieces, useReject, useReschedule } from '../api/contentPieces.js';
import { Header } from '../components/Header.js';
import { PendingSidebar } from '../components/PendingSidebar.js';
import { ReviewDrawer } from '../components/ReviewDrawer.js';
import { CalendarToolbar, type CalendarView } from '../components/calendar/CalendarToolbar.js';
import { KanbanView } from '../components/calendar/KanbanView.js';
import { MonthView } from '../components/calendar/MonthView.js';
import { WeekView } from '../components/calendar/WeekView.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { useSSE } from '../hooks/useSSE.js';
import { dateUtils } from '../lib/dates.js';

export function CalendarPage() {
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarView>('week');
  const [cursor, setCursor] = useState(() => new Date());

  // Cargamos lo suficiente para todas las vistas. Filtrado a un mes alrededor del cursor.
  const fromDate = dateUtils.subDays(cursor, 7).toISOString();
  const toDate = dateUtils.addDays(cursor, 45).toISOString();
  const { data, isLoading } = useContentPieces({ fromDate, toDate });
  const pieces = data?.items ?? [];

  const activeId = params.id ?? null;

  useSSE(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const reschedule = useReschedule();
  const approve = useApprove();
  const reject = useReject();

  function handleDragEnd(e: DragEndEvent) {
    const overId = e.over?.id?.toString();
    const data = e.active.data.current as { pieceId?: string; variantId?: string } | undefined;
    if (!overId || !data?.pieceId) return;

    if (overId.startsWith('slot:')) {
      const slotIso = overId.slice('slot:'.length);
      if (!data.variantId) return;
      reschedule.mutate({
        pieceId: data.pieceId,
        variantId: data.variantId,
        scheduledAt: slotIso === 'unscheduled' ? null : slotIso,
      });
      return;
    }
    if (overId.startsWith('kanban:')) {
      const status = overId.slice('kanban:'.length);
      if (status === 'APPROVED') approve.mutate({ id: data.pieceId });
      else if (status === 'REJECTED') {
        reject.mutate({ id: data.pieceId, reason: 'Movido a Rechazadas desde Kanban' });
      }
      // Otras columnas requieren acciones específicas; el drawer manual sigue siendo el camino.
    }
  }

  useKeyboardShortcuts({
    j: () =>
      setCursor((c) => (view === 'month' ? dateUtils.addMonths(c, 1) : dateUtils.addDays(c, 7))),
    k: () =>
      setCursor((c) => (view === 'month' ? dateUtils.subMonths(c, 1) : dateUtils.subDays(c, 7))),
    t: () => setCursor(new Date()),
    r: () => {
      const first = pieces.find((p) => p.status === 'IN_REVIEW');
      if (first) navigate(`/piece/${first.id}`);
    },
  });

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr]">
        <div className="lg:order-2">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <CalendarToolbar view={view} setView={setView} cursor={cursor} setCursor={setCursor} />
            {isLoading ? (
              <p className="card text-sm text-qyro-text-muted">Cargando piezas…</p>
            ) : view === 'week' ? (
              <WeekView cursor={cursor} pieces={pieces} onPick={(id) => navigate(`/piece/${id}`)} />
            ) : view === 'month' ? (
              <MonthView
                cursor={cursor}
                pieces={pieces}
                onPick={(id) => navigate(`/piece/${id}`)}
              />
            ) : (
              <KanbanView pieces={pieces} onPick={(id) => navigate(`/piece/${id}`)} />
            )}
            <ShortcutsHint />
          </DndContext>
        </div>
        <div className="lg:order-1">
          <PendingSidebar onPick={(id) => navigate(`/piece/${id}`)} activeId={activeId} />
        </div>
      </div>

      <ReviewDrawer pieceId={activeId} onClose={() => navigate('/calendar')} />
    </div>
  );
}

function ShortcutsHint() {
  return (
    <p className="mt-4 text-center text-[11px] text-qyro-text-muted">
      Atajos: <kbd className="rounded bg-qyro-bg-canvas px-1">J</kbd> siguiente ·{' '}
      <kbd className="rounded bg-qyro-bg-canvas px-1">K</kbd> anterior ·{' '}
      <kbd className="rounded bg-qyro-bg-canvas px-1">T</kbd> hoy ·{' '}
      <kbd className="rounded bg-qyro-bg-canvas px-1">R</kbd> ir a revisión
    </p>
  );
}
