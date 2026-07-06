/**
 * useIssues — Issues listesi için React Query tabanlı hook
 * mockIssues.ts yerine gerçek API kullanır
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issuesApi } from '@/lib/api';
import type { Issue } from '@/store/useAppStore';

type IssueStatus = Issue['status'];

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const issueKeys = {
  all: ['issues'] as const,
  list: (params: object) => [...issueKeys.all, 'list', params] as const,
  detail: (id: string) => [...issueKeys.all, 'detail', id] as const,
};

// ─── Filtre parametreleri ─────────────────────────────────────────────────────

export interface IssueListParams {
  cursor?: string;
  limit?: number;
  city?: string;
  district?: string;
  category?: string;
  status?: string;
  search?: string;
}

// ─── useIssues — Liste ────────────────────────────────────────────────────────

export function useIssues(params: Omit<IssueListParams, 'cursor'> = {}) {
  return useInfiniteQuery({
    queryKey: issueKeys.list(params),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const response = await issuesApi.list({ ...params, cursor: pageParam } as any) as any;
      return {
        issues: (response.data ?? []) as Issue[],
        nextCursor: response.meta?.nextCursor as string | undefined,
        total: response.meta?.total ?? 0,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}

// ─── useIssue — Tekil ─────────────────────────────────────────────────────────

export function useIssue(id: string | null) {
  return useQuery({
    queryKey: issueKeys.detail(id!),
    queryFn: async () => {
      const response = await issuesApi.getById(id!) as any;
      return response.data as Issue;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ─── useUpdateIssueStatus — Mutation ──────────────────────────────────────────

export function useUpdateIssueStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: IssueStatus;
      note?: string;
    }) => issuesApi.updateStatus(id, status, note),

    onSuccess: (_, variables) => {
      // Cache'i geçersiz kıl — liste ve detay yeniden yüklenecek
      qc.invalidateQueries({ queryKey: issueKeys.all });
      qc.invalidateQueries({ queryKey: issueKeys.detail(variables.id) });
    },
  });
}

// ─── useDeleteIssue — Mutation ────────────────────────────────────────────────

export function useDeleteIssue() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => issuesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: issueKeys.all });
    },
  });
}

// ─── useCreateIssue — Mutation ────────────────────────────────────────────────

export function useCreateIssue() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => issuesApi.create(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: issueKeys.all });
    },
  });
}
