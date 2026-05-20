import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { isMockApiEnabled } from '../lib/mockApi.js';

export function useSSE(enabled: boolean, workspaceSlug?: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || isMockApiEnabled()) return;
    const wsParam = workspaceSlug ? `?ws=${encodeURIComponent(workspaceSlug)}` : '';
    const es = new EventSource(`/sse/notifications${wsParam}`, { withCredentials: true });

    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['content-pieces'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
      qc.invalidateQueries({ queryKey: ['content-piece'] });
    };

    es.addEventListener('content-piece.ingested', refresh);
    es.addEventListener('content-piece.status-changed', refresh);
    es.addEventListener('ready', () => { refresh(); });

    return () => es.close();
  }, [enabled, workspaceSlug, qc]);
}
