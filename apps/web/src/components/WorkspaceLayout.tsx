import { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useWorkspaces } from '../lib/workspace.js';
import { setActiveWorkspaceSlug, WorkspaceProvider, LAST_WORKSPACE_KEY } from '../lib/workspace.js';
import { CommandPalette } from './CommandPalette.js';
import { Header } from './Header.js';

export function WorkspaceLayout() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, isLoading } = useWorkspaces();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (slug) {
      setActiveWorkspaceSlug(slug);
      localStorage.setItem(LAST_WORKSPACE_KEY, slug);
    }
    return () => setActiveWorkspaceSlug('');
  }, [slug]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-qyro-blue-500 border-t-transparent" />
      </div>
    );
  }

  const workspace = data?.items.find((w) => w.slug === slug);

  if (!workspace) {
    const fallback = data?.items[0]?.slug;
    return <Navigate to={fallback ? `/w/${fallback}/calendar` : '/workspaces/new'} replace />;
  }

  return (
    <WorkspaceProvider slug={slug} workspace={workspace}>
      <div className="min-h-screen bg-qyro-bg-canvas">
        <div
          className="h-0.5 w-full"
          style={{ background: workspace.brandColorPrimary }}
        />
        <Header onOpenPalette={() => setPaletteOpen(true)} />
        <Outlet />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </WorkspaceProvider>
  );
}
