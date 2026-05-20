import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContentPieces } from '../api/contentPieces.js';
import { useWorkspace, useWorkspaces } from '../lib/workspace.js';

interface Command {
  id: string;
  label: string;
  sub?: string;
  action: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { slug } = useWorkspace();
  const { data: workspacesData } = useWorkspaces();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: piecesData } = useContentPieces(
    { status: ['IN_REVIEW'], limit: 20 },
    { enabled: open },
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands: Command[] = [];

  // Navigation
  commands.push(
    { id: 'nav-calendar', label: 'Ir al Calendario', sub: 'navegación', action: () => navigate(`/w/${slug}/calendar`) },
    { id: 'nav-dashboard', label: 'Ir al Dashboard', sub: 'navegación', action: () => navigate(`/w/${slug}/dashboard`) },
    { id: 'nav-settings', label: 'Ajustes del workspace', sub: 'navegación', action: () => navigate(`/w/${slug}/settings`) },
    { id: 'nav-new-ws', label: 'Crear nuevo workspace', sub: 'workspace', action: () => navigate('/workspaces/new') },
  );

  // Workspace switch
  for (const ws of workspacesData?.items ?? []) {
    if (ws.slug !== slug) {
      commands.push({
        id: `ws-${ws.slug}`,
        label: `Cambiar a "${ws.name}"`,
        sub: 'workspace',
        action: () => navigate(`/w/${ws.slug}/calendar`),
      });
    }
  }

  // Pending review pieces
  for (const p of piecesData?.items ?? []) {
    commands.push({
      id: `piece-${p.id}`,
      label: p.title,
      sub: `${p.format} · en revisión`,
      action: () => navigate(`/w/${slug}/piece/${p.id}`),
    });
  }

  const filtered = query.trim()
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          (c.sub ?? '').toLowerCase().includes(query.toLowerCase()),
      )
    : commands;

  function confirm(cmd: Command) {
    cmd.action();
    onClose();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selected];
      if (cmd) confirm(cmd);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 top-24 z-50 mx-auto max-w-xl px-4">
        <div className="overflow-hidden rounded-card bg-qyro-bg-surface shadow-2xl ring-1 ring-qyro-border-subtle">
          <div className="flex items-center gap-3 border-b border-qyro-border-subtle px-4 py-3">
            <svg className="h-4 w-4 shrink-0 text-qyro-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar piezas, navegar, cambiar workspace…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
              onKeyDown={handleKey}
              className="min-w-0 flex-1 bg-transparent text-sm text-qyro-text-primary placeholder:text-qyro-text-muted focus:outline-none"
            />
            <kbd className="hidden rounded bg-qyro-bg-canvas px-1.5 py-0.5 text-[10px] text-qyro-text-muted sm:inline">ESC</kbd>
          </div>

          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-qyro-text-muted">Sin resultados</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {filtered.map((cmd, i) => (
                <li key={cmd.id}>
                  <button
                    type="button"
                    onClick={() => confirm(cmd)}
                    onMouseEnter={() => setSelected(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === selected ? 'bg-qyro-blue-500/10 text-qyro-blue-600' : 'text-qyro-text-primary hover:bg-qyro-bg-canvas'
                    }`}
                  >
                    <span className="flex-1 truncate text-sm">{cmd.label}</span>
                    {cmd.sub && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-qyro-text-muted">
                        {cmd.sub}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-qyro-border-subtle px-4 py-2 text-[10px] text-qyro-text-muted">
            ↑↓ navegar · Enter confirmar · Esc cerrar
          </div>
        </div>
      </div>
    </>
  );
}
