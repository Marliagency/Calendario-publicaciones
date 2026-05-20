import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaces, LAST_WORKSPACE_KEY } from '../lib/workspace.js';

export function WorkspaceRedirectPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useWorkspaces();

  useEffect(() => {
    if (isLoading) return;
    const workspaces = data?.items ?? [];
    if (workspaces.length === 0) {
      navigate('/workspaces/new', { replace: true });
      return;
    }
    const last = localStorage.getItem(LAST_WORKSPACE_KEY);
    const target = workspaces.find((w) => w.slug === last) ?? workspaces[0]!;
    navigate(`/w/${target.slug}/calendar`, { replace: true });
  }, [data, isLoading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-qyro-blue-500 border-t-transparent" />
    </div>
  );
}
