import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUnreadCount } from '../api/contentPieces.js';
import { api } from '../lib/api.js';
import { useMe } from '../lib/auth.jsx';

export function Header() {
  const { data: me } = useMe();
  const { data: counts } = useUnreadCount();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const loc = useLocation();

  async function logout() {
    await api('/api/v1/auth/logout', { method: 'POST' });
    await qc.invalidateQueries({ queryKey: ['me'] });
    navigate('/login', { replace: true });
  }

  const inReview = counts?.in_review ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-qyro-border-subtle bg-qyro-bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-card-sm bg-qyro-blue-500 font-bold text-white">
            Q
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-qyro-text-primary">Social Calendar</p>
            <p className="text-[11px] text-qyro-text-muted">QYRO</p>
          </div>
        </div>
        <nav className="hidden gap-1 sm:flex">
          <NavLink
            to="/calendar"
            active={
              loc.pathname.startsWith('/calendar') ||
              loc.pathname === '/' ||
              loc.pathname.startsWith('/piece')
            }
          >
            Calendario
          </NavLink>
          <NavLink to="/dashboard" active={loc.pathname.startsWith('/dashboard')}>
            Dashboard
          </NavLink>
        </nav>
        <div className="flex items-center gap-3">
          {inReview > 0 && (
            <span
              className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-qyro-amber-500/15 px-2 text-xs font-semibold text-amber-700"
              title={`${inReview} piezas pendientes de revisar`}
            >
              {inReview} en revisión
            </span>
          )}
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
