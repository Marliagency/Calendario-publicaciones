import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export interface DashboardData {
  total: number;
  byStatus: Record<string, number>;
  approvalRate: number;
  avgReviewMin: number;
  failedRate: number;
  holdRate: number;
  topPosts: { id: string; title: string; engagement: number }[];
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardData>('/api/v1/dashboard'),
    refetchInterval: 60_000,
  });
}

export interface AudiencePreset {
  id: string;
  name: string;
  geo: string[];
  ageMin: number;
  ageMax: number;
  placementsRecommended: string[];
}

export function useAudiencePresets() {
  return useQuery({
    queryKey: ['audience-presets'],
    queryFn: () => api<{ items: AudiencePreset[] }>('/api/v1/audience-presets'),
  });
}

export interface SpendSummary {
  allowed: boolean;
  daily: { committedEur: number; spentEur: number; capEur: number };
  monthly: { committedEur: number; spentEur: number; capEur: number };
}

export function useSpendSummary() {
  return useQuery({
    queryKey: ['spend-summary'],
    queryFn: () => api<SpendSummary>('/api/v1/boost/spend-summary'),
    refetchInterval: 30_000,
  });
}

export function useBoost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      id: string;
      dailyBudgetEur: number;
      durationDays: number;
      objective: 'REACH' | 'VIDEO_VIEWS' | 'TRAFFIC' | 'CONVERSIONS' | 'FOLLOWERS';
      audiencePresetId: string;
    }) =>
      api(`/api/v1/content-pieces/${vars.id}/boost`, {
        method: 'POST',
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-piece'] });
      qc.invalidateQueries({ queryKey: ['spend-summary'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRefreshMetrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api('/api/v1/metrics/refresh', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
  });
}
