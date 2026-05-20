import { useEffect } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useWorkspaces } from '../lib/workspace.js';
import { setActiveWorkspaceSlug, WorkspaceProvider, LAST_WORKSPACE_KEY } from '../lib/workspace.js';
import { Header } from './Header.js';

export function WorkspaceLayout() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { data, isLoading } = useWorkspaces();

  // Keep module-level slug in sync for api() calls.
  useEffect(() => {
    if (slug) {
      setActiveWorkspaceSlug(slug);
      localStorage.setItem(LAST_WORKSPACE_KEY, slug);
    }
    return () => setActiveWorkspaceSlug('');
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-qyro-blue-500 border-t-transparent" />
      </div>
    );
  }

  const workspace = data?.items.find((w) => w.slug === slug);

  if (!workspace) {
    // Workspace not found or user has no access.
    const fallback = data?.items[0]?.slug;
    return <Navigate to={fallback ? `/w/${fallback}/calendar` : '/workspaces/new'} replace />;
  }

  return (
    <WorkspaceProvider slug={slug} workspace={workspace}>
      <div className="min-h-screen bg-qyro-bg-canvas">
        {/* Thin brand color stripe at very top */}
        <div
          className="h-0.5 w-full"
          style={{ background: workspace.brandColorPrimary }}
        />
        <Header />
        <Outlet />
      </div>
    </WorkspaceProvider>
  );
}
