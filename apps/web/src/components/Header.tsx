import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useUnreadCount } from '../api/contentPieces.js';
import { api } from '../lib/api.js';
import { useMe } from '../lib/auth.jsx';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.js';

export function Header({ onOpenPalette }: { onOpenPalette?: () => void }) {
  const { data: me } = useMe();
  const { data: counts } = useUnreadCount();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const loc = useLocation();
  const { slug = '' } = useParams<{ slug: string }>();

  async function logout() {
    await api('/api/v1/auth/logout', { method: 'POST' });
    await qc.invalidateQueries({ queryKey: ['me'] });
    navigate('/login', { replace: true });
  }

  const inReview = counts?.in_review ?? 0;
  const base = slug ? `/w/${slug}` : '';

  return (
    <header className="sticky top-0 z-30 border-b border-qyro-border-subtle bg-qyro-bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <WorkspaceSwitcher />
        </div>

        <nav className="hidden gap-1 sm:flex">
          <NavLink
            to={`${base}/calendar`}
            active={loc.pathname.includes('/calendar') || loc.pathname.includes('/piece')}
          >
            Calendario
          </NavLink>
          <NavLink to={`${base}/dashboard`} active={loc.pathname.includes('/dashboard')}>
            Dashboard
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {inReview > 0 && (
            <span
              className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-qyro-amber-500/15 px-2 text-xs font-semibold text-amber-700"
              title={`${inReview} piezas pendientes de revisar`}
            >
              {inReview} en revisión
            </span>
          )}

          {onOpenPalette && (
            <button
              type="button"
              onClick={onOpenPalette}
              className="hidden items-center gap-1.5 rounded-card-sm border border-qyro-border-subtle bg-qyro-bg-canvas px-2.5 py-1 text-xs text-qyro-text-muted transition-colors hover:border-qyro-blue-500 hover:text-qyro-text-primary sm:flex"
              title="Abrir paleta de comandos (⌘K)"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <span>Buscar</span>
              <kbd className="rounded bg-qyro-bg-surface px-1 font-mono text-[10px]">⌘K</kbd>
            </button>
          )}

          <Link
            to={`${base}/settings`}
            className="rounded-card-sm p-1.5 text-qyro-text-muted transition-colors hover:text-qyro-text-primary"
            title="Ajustes del workspace"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>

          <span className="hidden text-xs text-qyro-text-muted sm:inline">{me?.user.email}</span>
          <button type="button" onClick={logout} className="btn-ghost text-sm">
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={
        active
          ? 'rounded-pill bg-qyro-blue-500/10 px-3 py-1.5 text-sm font-medium text-qyro-blue-600'
          : 'rounded-pill px-3 py-1.5 text-sm text-qyro-text-muted hover:text-qyro-text-primary'
      }
    >
      {children}
    </Link>
  );
}
