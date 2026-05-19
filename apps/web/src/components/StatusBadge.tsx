import clsx from 'clsx';
import type { ContentStatus } from '../api/contentPieces.js';

const COLORS: Record<ContentStatus, string> = {
  DRAFT: 'bg-slate-200 text-slate-700',
  IN_REVIEW: 'bg-amber-100 text-amber-800',
  CHANGES_REQUESTED: 'bg-amber-100 text-amber-800',
  REJECTED: 'bg-red-100 text-red-700',
  APPROVED: 'bg-qyro-blue-500/10 text-qyro-blue-600',
  SCHEDULED: 'bg-qyro-purple-500/10 text-qyro-purple-500',
  PUBLISHED: 'bg-qyro-green-500/10 text-qyro-green-500',
  ANALYZED: 'bg-qyro-purple-500/10 text-qyro-purple-500',
  FAILED: 'bg-red-100 text-red-700',
};

const LABELS: Record<ContentStatus, string> = {
  DRAFT: 'Borrador',
  IN_REVIEW: 'En revisión',
  CHANGES_REQUESTED: 'Cambios pedidos',
  REJECTED: 'Rechazada',
  APPROVED: 'Aprobada',
  SCHEDULED: 'Programada',
  PUBLISHED: 'Publicada',
  ANALYZED: 'Analizada',
  FAILED: 'Falló',
};

export function StatusBadge({
  status,
  size = 'md',
}: { status: ContentStatus; size?: 'sm' | 'md' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-pill font-medium',
        COLORS[status],
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      )}
    >
      {LABELS[status]}
    </span>
  );
}
