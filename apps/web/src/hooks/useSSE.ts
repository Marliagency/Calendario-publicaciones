import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { isMockApiEnabled } from '../lib/mockApi.js';

/**
 * Conecta al endpoint SSE `/sse/notifications` y, al recibir un evento, invalida
 * las queries afectadas (badge, lista de piezas). El navegador reconecta solo.
 */
export function useSSE(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || isMockApiEnabled()) return;
    const es = new EventSource('/sse/notifications', { withCredentials: true });

    const refresh = () => {
      qc.invalidateQueries({ queryKey: ['content-pieces'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
      qc.invalidateQueries({ queryKey: ['content-piece'] });
    };

    es.addEventListener('content-piece.ingested', refresh);
    es.addEventListener('content-piece.status-changed', refresh);
    es.addEventListener('ready', () => {
      // Sync inicial al (re)conectar.
      refresh();
    });

    return () => es.close();
  }, [enabled, qc]);
}
