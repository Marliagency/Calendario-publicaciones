import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace, useWorkspaces } from '../lib/workspace.js';

export function WorkspaceSwitcher() {
  const { workspace, slug } = useWorkspace();
  const { data } = useWorkspaces();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const workspaces = data?.items ?? [];

  function selectWorkspace(newSlug: string) {
    setOpen(false);
    if (newSlug !== slug) {
      navigate(`/w/${newSlug}/calendar`);
    }
  }

  if (!workspace) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-card-sm px-2 py-1.5 text-sm font-medium text-qyro-text-primary hover:bg-qyro-bg-surface transition-colors"
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white flex-shrink-0"
          style={{ background: workspace.brandColorPrimary }}
        >
          {(workspace.name[0] ?? '?').toUpperCase()}
        </span>
        <span className="max-w-[120px] truncate">{workspace.name}</span>
        <svg className="h-3.5 w-3.5 text-qyro-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-card bg-qyro-bg-surface shadow-lg ring-1 ring-qyro-border-subtle py-1">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                type="button"
                onClick={() => selectWorkspace(ws.slug)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-qyro-bg-canvas transition-colors"
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white flex-shrink-0"
                  style={{ background: ws.brandColorPrimary }}
                >
                  {(ws.name[0] ?? '?').toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-qyro-text-primary">{ws.name}</p>
                  <p className="truncate text-[11px] text-qyro-text-muted capitalize">{ws.role.toLowerCase()}</p>
                </div>
                {ws.slug === slug && (
                  <svg className="h-4 w-4 text-qyro-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
            <div className="my-1 border-t border-qyro-border-subtle" />
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/workspaces/new'); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-qyro-text-muted hover:bg-qyro-bg-canvas transition-colors"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded border border-dashed border-qyro-border-subtle text-xs">+</span>
              Nuevo workspace
            </button>
          </div>
        </>
      )}
    </div>
  );
}
