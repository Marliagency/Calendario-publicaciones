import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './api.js';

export interface WorkspaceSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brandColorPrimary: string;
  brandColorSecondary: string;
  brandLogoUrl: string | null;
  status: string;
  role: string;
  inReviewCount: number;
  lastActiveAt: string | null;
}

export interface WorkspaceDetail extends WorkspaceSummary {
  defaultTimezone: string;
  defaultLanguage: string;
  dailyBoostCapEur: number;
  monthlyBoostCapEur: number;
}

// Module-level slug injected by WorkspaceLayout so api() can read it without
// needing the React context (TanStack Query callbacks run outside React tree).
let _activeSlug = '';

export function setActiveWorkspaceSlug(slug: string) {
  _activeSlug = slug;
}

export function getActiveWorkspaceSlug(): string {
  return _activeSlug;
}

export const LAST_WORKSPACE_KEY = 'qyro:last-workspace';

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useWorkspaces() {
  return useQuery<{ items: WorkspaceSummary[] }>({
    queryKey: ['workspaces'],
    queryFn: () => api('/api/v1/workspaces'),
    staleTime: 60_000,
  });
}

export function useWorkspaceDetail(slug: string) {
  return useQuery<{ workspace: WorkspaceDetail; role: string }>({
    queryKey: ['workspace', slug],
    queryFn: () =>
      api(`/api/v1/workspaces/${slug}`, {
        headers: { 'X-Workspace-Slug': slug },
      }),
    staleTime: 60_000,
    enabled: !!slug,
  });
}

// ── Context ───────────────────────────────────────────────────────────────────

interface WorkspaceCtx {
  slug: string;
  workspace: WorkspaceSummary | undefined;
}

const WorkspaceContext = createContext<WorkspaceCtx>({ slug: '', workspace: undefined });

export function WorkspaceProvider({
  slug,
  workspace,
  children,
}: {
  slug: string;
  workspace: WorkspaceSummary | undefined;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={{ slug, workspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceCtx {
  return useContext(WorkspaceContext);
}
