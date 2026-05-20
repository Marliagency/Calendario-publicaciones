import { tryMockApi } from './mockApi.js';
import { getActiveWorkspaceSlug } from './workspace.js';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const mocked = tryMockApi<T>(path, init);
  if (mocked !== undefined) return mocked;

  const slug = getActiveWorkspaceSlug();
  const extraHeaders: Record<string, string> = slug ? { 'X-Workspace-Slug': slug } : {};

  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
      ...(init.headers as Record<string, string> | undefined ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
