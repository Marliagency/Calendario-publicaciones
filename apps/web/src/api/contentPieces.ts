import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import type { PlatformKind } from '../lib/platforms.js';

export type ContentStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'ANALYZED'
  | 'FAILED';

export interface PlatformVariant {
  id: string;
  kind: PlatformKind;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'carousel';
  ratio: string;
  durationS: number | null;
  caption: string | null;
  hashtags: string[];
  firstComment: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
}

export interface ContentPiece {
  id: string;
  externalRef: string | null;
  title: string;
  format: string;
  status: ContentStatus;
  hookUsed: string | null;
  frameworkUsed: string | null;
  qcChecklistJson: unknown;
  boostBudgetEur: string | null;
  createdAt: string;
  updatedAt: string;
  variants: PlatformVariant[];
  buyerPersonas?: { buyerPersona: { id: string; name: string } }[];
  campaign?: { id: string; name: string } | null;
  auditLogs?: {
    id: string;
    fromStatus: string | null;
    toStatus: string | null;
    comment: string | null;
    createdAt: string;
  }[];
}

export function useContentPieces(
  filters: {
    status?: ContentStatus[];
    platform?: PlatformKind[];
    fromDate?: string;
    toDate?: string;
  } = {},
) {
  const params = new URLSearchParams();
  if (filters.status?.length) params.set('status', filters.status.join(','));
  if (filters.platform?.length) params.set('platform', filters.platform.join(','));
  if (filters.fromDate) params.set('fromDate', filters.fromDate);
  if (filters.toDate) params.set('toDate', filters.toDate);

  return useQuery({
    queryKey: ['content-pieces', filters],
    queryFn: () => api<{ items: ContentPiece[] }>(`/api/v1/content-pieces?${params}`),
    refetchOnWindowFocus: true,
  });
}

export function useContentPiece(id: string | null) {
  return useQuery({
    queryKey: ['content-piece', id],
    enabled: !!id,
    queryFn: () => api<{ piece: ContentPiece }>(`/api/v1/content-pieces/${id}`),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['unread-count'],
    queryFn: () =>
      api<{ in_review: number; unread_deliveries: number }>('/api/v1/notifications/unread-count'),
    refetchInterval: 30_000,
  });
}

function invalidatePieces(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['content-pieces'] });
  qc.invalidateQueries({ queryKey: ['content-piece'] });
  qc.invalidateQueries({ queryKey: ['unread-count'] });
}

export function useApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; qcChecklist?: Record<string, boolean> }) =>
      api(`/api/v1/content-pieces/${vars.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ qcChecklist: vars.qcChecklist ?? {} }),
      }),
    onSuccess: () => invalidatePieces(qc),
  });
}

export function useReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reason: string }) =>
      api(`/api/v1/content-pieces/${vars.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: vars.reason }),
      }),
    onSuccess: () => invalidatePieces(qc),
  });
}

export function useRequestChanges() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; comment: string }) =>
      api(`/api/v1/content-pieces/${vars.id}/request-changes`, {
        method: 'POST',
        body: JSON.stringify({ comment: vars.comment }),
      }),
    onSuccess: () => invalidatePieces(qc),
  });
}

export function useReschedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { pieceId: string; variantId: string; scheduledAt: string | null }) =>
      api(`/api/v1/content-pieces/${vars.pieceId}/variants/${vars.variantId}/schedule`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduledAt: vars.scheduledAt }),
      }),
    onSuccess: () => invalidatePieces(qc),
  });
}

export function useQCRun(id: string | null) {
  return useQuery({
    queryKey: ['qc-run', id],
    enabled: !!id,
    queryFn: () =>
      api<{
        automatic: Array<{
          ruleType: string;
          severity: 'BLOCKER' | 'WARNING' | 'INFO';
          platform: PlatformKind | null;
          message: string;
        }>;
        manual: Array<{
          ruleId: string;
          ruleType: string;
          name: string;
          severity: 'BLOCKER' | 'WARNING' | 'INFO';
          description: string | null;
        }>;
      }>(`/api/v1/content-pieces/${id}/qc-run`, { method: 'POST' }),
  });
}
