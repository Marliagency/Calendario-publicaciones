import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  type ContentPiece,
  useApprove,
  useContentPiece,
  useQCRun,
  useReject,
  useRequestChanges,
} from '../api/contentPieces.js';
import { dateUtils } from '../lib/dates.js';
import { PLATFORM_LABEL } from '../lib/platforms.js';
import { BoostPanel } from './BoostPanel.js';
import { PlatformIcon } from './PlatformIcon.js';
import { StatusBadge } from './StatusBadge.js';

/**
 * Drawer lateral con detalle de pieza:
 *   - Previews por variante (vídeo / imagen)
 *   - Caption y hashtags
 *   - Checklist QC (auto + manual)
 *   - Botones: Aprobar / Pedir cambios / Rechazar / Duplicar
 *   - Historial reciente de cambios de estado
 */
export function ReviewDrawer({
  pieceId,
  onClose,
}: { pieceId: string | null; onClose: () => void }) {
  const { data } = useContentPiece(pieceId);
  const piece = data?.piece;

  return (
    <AnimatePresence>
      {pieceId && (
        <motion.div
          className="fixed inset-0 z-40 flex justify-end bg-black/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            className="h-full w-full max-w-2xl overflow-y-auto bg-qyro-bg-canvas shadow-elevated"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {piece ? (
              <DrawerContent piece={piece} pieceId={pieceId} onClose={onClose} />
            ) : (
              <div className="p-8 text-sm text-qyro-text-muted">Cargando…</div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DrawerContent({
  piece,
  pieceId,
  onClose,
}: {
  piece: ContentPiece;
  pieceId: string;
  onClose: () => void;
}) {
  const approve = useApprove();
  const reject = useReject();
  const requestChanges = useRequestChanges();
  const { data: qcData } = useQCRun(pieceId);

  const [rejectReason, setRejectReason] = useState('');
  const [changesComment, setChangesComment] = useState('');
  const [manualChecks, setManualChecks] = useState<Record<string, boolean>>({});

  // biome-ignore lint/correctness/useExhaustiveDependencies: pieceId es justo lo que dispara el reset.
  useEffect(() => {
    setRejectReason('');
    setChangesComment('');
    setManualChecks({});
  }, [pieceId]);

  const canApprove = ['IN_REVIEW', 'APPROVED'].includes(piece.status);
  const manualAllChecked =
    (qcData?.manual ?? []).every((m) => manualChecks[m.ruleId] === true) ?? true;
  const hasAutoBlockers = (qcData?.automatic ?? []).some((i) => i.severity === 'BLOCKER') ?? false;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <StatusBadge status={piece.status} />
          <h2 className="mt-2 text-xl font-semibold leading-tight">{piece.title}</h2>
          <p className="mt-1 text-xs uppercase tracking-wide text-qyro-text-muted">
            {piece.format} · {piece.frameworkUsed ?? '—'}
          </p>
          {piece.hookUsed && (
            <p className="mt-2 rounded-card-sm bg-qyro-blue-500/5 px-3 py-2 text-xs italic text-qyro-text-primary">
              “{piece.hookUsed}”
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} className="btn-ghost text-sm">
          Cerrar
        </button>
      </div>

      {/* Variantes por plataforma */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Variantes por plataforma</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {piece.variants.map((v) => (
            <div key={v.id} className="card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlatformIcon kind={v.kind} />
                  <p className="text-sm font-medium">{PLATFORM_LABEL[v.kind]}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-qyro-text-muted">
                  {v.ratio} · {v.durationS ? `${v.durationS}s` : 'imagen'}
                </span>
              </div>
              <div className="my-2 flex aspect-[9/16] max-h-40 items-center justify-center overflow-hidden rounded-card-sm bg-qyro-bg-canvas text-[10px] text-qyro-text-muted">
                {v.mediaType === 'video' ? '🎬' : '🖼'} {v.mediaUrl.split('/').pop()}
              </div>
              {v.caption && (
                <p className="line-clamp-3 text-xs leading-snug text-qyro-text-primary">
                  {v.caption}
                </p>
              )}
              {v.hashtags.length > 0 && (
                <p className="mt-1 text-[11px] text-qyro-blue-600">{v.hashtags.join(' ')}</p>
              )}
              {v.scheduledAt && (
                <p className="mt-2 text-[10px] tabular-nums text-qyro-text-muted">
                  Programada para {dateUtils.fmt(v.scheduledAt, "EEE d MMM 'a las' HH:mm")}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* QC */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Checklist QC</h3>
        {qcData ? (
          <>
            {qcData.automatic.length > 0 && (
              <ul className="space-y-1.5">
                {qcData.automatic.map((iss, idx) => (
                  <li
                    key={`${iss.ruleType}-${idx}`}
                    className={
                      iss.severity === 'BLOCKER'
                        ? 'rounded-card-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'
                        : 'rounded-card-sm border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'
                    }
                  >
                    <span className="font-semibold">
                      {iss.severity === 'BLOCKER' ? '⛔' : '⚠️'} {iss.ruleType}
                      {iss.platform && ` (${iss.platform})`}:
                    </span>{' '}
                    {iss.message}
                  </li>
                ))}
              </ul>
            )}
            {qcData.automatic.length === 0 && (
              <p className="rounded-card-sm bg-qyro-green-500/10 px-3 py-2 text-xs text-qyro-green-500">
                ✓ Reglas automáticas OK
              </p>
            )}
            {qcData.manual.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide text-qyro-text-muted">
                  Comprobaciones manuales
                </p>
                {qcData.manual.map((m) => (
                  <label
                    key={m.ruleId}
                    className="flex items-start gap-2 rounded-card-sm border border-qyro-border-subtle px-3 py-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={!!manualChecks[m.ruleId]}
                      onChange={(e) =>
                        setManualChecks((s) => ({ ...s, [m.ruleId]: e.target.checked }))
                      }
                    />
                    <span>
                      <strong>{m.name}</strong>
                      {m.description && (
                        <span className="block text-qyro-text-muted">{m.description}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-qyro-text-muted">Cargando reglas…</p>
        )}
      </section>

      {/* Acciones */}
      <section className="card space-y-3 p-4">
        <h3 className="text-sm font-semibold">Decisión</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canApprove || hasAutoBlockers || !manualAllChecked || approve.isPending}
            onClick={() =>
              approve.mutate({ id: pieceId, qcChecklist: manualChecks }, { onSuccess: onClose })
            }
            className="btn-primary disabled:opacity-50"
            title={
              hasAutoBlockers
                ? 'Hay blockers automáticos'
                : !manualAllChecked
                  ? 'Marca todos los checks manuales'
                  : ''
            }
          >
            {approve.isPending ? 'Aprobando…' : 'Aprobar'}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="changes-comment"
              className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-qyro-text-muted"
            >
              Pedir cambios
            </label>
            <textarea
              id="changes-comment"
              className="input min-h-[64px]"
              placeholder="Qué cambiar…"
              value={changesComment}
              onChange={(e) => setChangesComment(e.target.value)}
            />
            <button
              type="button"
              disabled={!changesComment || requestChanges.isPending}
              onClick={() =>
                requestChanges.mutate(
                  { id: pieceId, comment: changesComment },
                  { onSuccess: onClose },
                )
              }
              className="btn-ghost mt-1 text-xs disabled:opacity-50"
            >
              Enviar cambios
            </button>
          </div>
          <div>
            <label
              htmlFor="reject-reason"
              className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-qyro-text-muted"
            >
              Rechazar
            </label>
            <textarea
              id="reject-reason"
              className="input min-h-[64px]"
              placeholder="Motivo del rechazo…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <button
              type="button"
              disabled={!rejectReason || reject.isPending}
              onClick={() =>
                reject.mutate({ id: pieceId, reason: rejectReason }, { onSuccess: onClose })
              }
              className="btn-ghost mt-1 text-xs text-red-600 disabled:opacity-50"
            >
              Rechazar definitivamente
            </button>
          </div>
        </div>
      </section>

      {/* Boost — sólo si la pieza ya está publicada */}
      {piece.status === 'PUBLISHED' && (
        <section className="card space-y-3 p-4">
          <h3 className="text-sm font-semibold">Promocionar (boost)</h3>
          <BoostPanel
            contentPieceId={pieceId}
            alreadyBoosted={!!piece.boostBudgetEur && Number(piece.boostBudgetEur) > 0}
          />
        </section>
      )}

      {/* Historial */}
      {(piece.auditLogs ?? []).length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Historial</h3>
          <ol className="space-y-1.5 text-xs text-qyro-text-muted">
            {piece.auditLogs?.map((log) => (
              <li key={log.id} className="flex items-start gap-2">
                <span className="tabular-nums">{dateUtils.fmt(log.createdAt, 'd MMM HH:mm')}</span>
                <span>
                  {log.fromStatus ?? '∅'} → <strong>{log.toStatus}</strong>
                  {log.comment && <span className="italic"> — {log.comment}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
