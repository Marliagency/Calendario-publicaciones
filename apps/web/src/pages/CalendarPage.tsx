import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useMe } from '../lib/auth.jsx';

export function CalendarPage() {
  const { data } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function logout() {
    await api('/api/v1/auth/logout', { method: 'POST' });
    await qc.invalidateQueries({ queryKey: ['me'] });
    navigate('/login', { replace: true });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-card-sm bg-qyro-blue-500 font-bold text-white">
            Q
          </div>
          <div>
            <h1 className="text-xl font-semibold text-qyro-text-primary">Social Calendar</h1>
            <p className="text-xs text-qyro-text-muted">{data?.user.email}</p>
          </div>
        </div>
        <button type="button" onClick={logout} className="btn-ghost text-sm">
          Salir
        </button>
      </header>

      <div className="card">
        <h2 className="text-base font-semibold">Calendario</h2>
        <p className="mt-2 text-sm text-qyro-text-muted">
          Placeholder de Fase 1. La vista mes/semana/día con drag&amp;drop, sidebar de pendientes y
          cola de QC se construye en Fases 3 y 4.
        </p>
      </div>
    </div>
  );
}
