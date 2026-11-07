import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '@/lib/api';
import type { AgentListParams, AgentPayload } from '@/types/agent';

export const agentKeys = {
  all: ['agents'] as const,
  list: (params: AgentListParams) => ['agents', 'list', params] as const,
  detail: (id: string) => ['agents', 'detail', id] as const,
  stats: ['agents', 'stats'] as const,
};

export function useAgents(params: AgentListParams) {
  return useQuery({
    queryKey: agentKeys.list(params),
    queryFn: () => agentsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useAgent(id: string) {
  return useQuery({ queryKey: agentKeys.detail(id), queryFn: () => agentsApi.get(id) });
}

export function useAgentStats() {
  return useQuery({ queryKey: agentKeys.stats, queryFn: () => agentsApi.stats() });
}

// Any mutation can change lists, details and stats, so refresh everything under ['agents'].
export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AgentPayload) => agentsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}

export function useUpdateAgent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AgentPayload>) => agentsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: agentKeys.all }),
  });
}
