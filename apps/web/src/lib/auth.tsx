import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ApiError, api } from './api.js';

interface Me {
  user: { sub: string; email: string; isAdmin: boolean };
}

export function useMe() {
  return useQuery<Me | null>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await api<Me>('/api/v1/auth/me');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
  });
}

export function RequireAuth() {
  const location = useLocation();
  const { data, isLoading } = useMe();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-qyro-text-muted">
        Cargando…
      </div>
    );
  }
  if (!data) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
