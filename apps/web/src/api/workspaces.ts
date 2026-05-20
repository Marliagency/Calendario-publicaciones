import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface WorkspaceApiKey {
  id: string;
  prefix: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function useApiKeys(slug: string) {
  return useQuery<{ keys: WorkspaceApiKey[] }>({
    queryKey: ['api-keys', slug],
    queryFn: () =>
      api(`/api/v1/workspaces/${slug}/api-keys`, {
        headers: { 'X-Workspace-Slug': slug },
      }),
    enabled: !!slug,
  });
}

export function useCreateApiKey(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api<{ id: string; prefix: string; name: string; raw: string; createdAt: string }>(
        `/api/v1/workspaces/${slug}/api-keys`,
        {
          method: 'POST',
          body: JSON.stringify({ name }),
          headers: { 'X-Workspace-Slug': slug },
        },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys', slug] }),
  });
}

export function useRevokeApiKey(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      api(`/api/v1/workspaces/${slug}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'X-Workspace-Slug': slug },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys', slug] }),
  });
}
