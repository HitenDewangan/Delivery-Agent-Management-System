import { API_URL } from '@/lib/config';
import type {
  Agent,
  AgentListParams,
  AgentListResult,
  AgentPayload,
  AgentStats,
  Pagination,
} from '@/types/agent';

export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field-level problems reported by the backend validator. */
  get fieldIssues(): FieldIssue[] {
    return this.code === 'VALIDATION_ERROR' && Array.isArray(this.details)
      ? (this.details as FieldIssue[])
      : [];
  }

  /** Fields that collided with a unique constraint (409). */
  get conflictFields(): string[] {
    const fields = (this.details as { fields?: unknown } | undefined)?.fields;
    return this.code === 'CONFLICT' && Array.isArray(fields) ? (fields as string[]) : [];
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  meta?: { pagination: Pagination };
  error?: { code: string; message: string; details?: unknown };
}

async function request<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is the backend running?');
  }

  let body: Envelope<T>;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(res.status, 'BAD_RESPONSE', 'The server returned an unexpected response.');
  }

  if (!res.ok || !body.success) {
    const err = body.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN_ERROR',
      err?.message ?? 'Something went wrong.',
      err?.details,
    );
  }
  return body;
}

function toQuery(params: AgentListParams): string {
  const q = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
  if (params.search) q.set('search', params.search);
  if (params.status) q.set('status', params.status);
  if (params.serviceArea) q.set('serviceArea', params.serviceArea);
  return q.toString();
}

export const agentsApi = {
  async list(params: AgentListParams): Promise<AgentListResult> {
    const body = await request<Agent[]>(`/agents?${toQuery(params)}`);
    return { items: body.data ?? [], pagination: body.meta?.pagination as Pagination };
  },
  async get(id: string): Promise<Agent> {
    return (await request<Agent>(`/agents/${id}`)).data as Agent;
  },
  async create(payload: AgentPayload): Promise<Agent> {
    const body = await request<Agent>('/agents', { method: 'POST', body: JSON.stringify(payload) });
    return body.data as Agent;
  },
  async update(id: string, payload: Partial<AgentPayload>): Promise<Agent> {
    const body = await request<Agent>(`/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return body.data as Agent;
  },
  async remove(id: string): Promise<void> {
    await request<{ id: string }>(`/agents/${id}`, { method: 'DELETE' });
  },
  async stats(): Promise<AgentStats> {
    return (await request<AgentStats>('/agents/stats')).data as AgentStats;
  },
};
