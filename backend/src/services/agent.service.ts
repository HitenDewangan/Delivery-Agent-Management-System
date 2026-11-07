import { agentRepository } from '../repositories/agent.repository';
import type {
  Agent,
  AgentListParams,
  AgentStats,
  CreateAgentInput,
  UpdateAgentInput,
} from '../types/agent';
import { NotFoundError } from '../utils/errors';
import { cacheService, cacheTtl, hashKeyParts, type CacheService } from './cache.service';

export interface PaginatedAgents {
  items: Agent[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

type AgentRepository = typeof agentRepository;

const detailKey = (id: string): string => `agents:detail:${id}`;

export function createAgentService(
  repo: AgentRepository,
  cache: CacheService,
  ttl: { list: number; detail: number },
) {
  return {
    async create(input: CreateAgentInput): Promise<Agent> {
      const agent = await repo.create(input);
      // Invalidate only after the database write succeeded.
      await cache.invalidateLists();
      return agent;
    },

    async list({ page, limit, ...filters }: AgentListParams): Promise<PaginatedAgents> {
      const load = async (): Promise<PaginatedAgents> => {
        const { items, total } = await repo.findMany(filters, (page - 1) * limit, limit);
        return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
      };

      // Version is read BEFORE the database so a concurrent mutation can never
      // cause fresh data to be filed under a stale version (or the reverse).
      const version = await cache.getListVersion();
      if (version === null) return load();

      // Search and area filters are case-insensitive in SQL, so normalise case in the key.
      const hash = hashKeyParts({
        page,
        limit,
        status: filters.status,
        area: filters.serviceArea?.toLowerCase(),
        search: filters.search?.toLowerCase(),
      });
      return cache.remember(`agents:list:v${version}:${hash}`, ttl.list, load);
    },

    async getById(id: string): Promise<Agent> {
      const agent = await cache.remember<Agent | null>(detailKey(id), ttl.detail, () =>
        repo.findById(id),
      );
      if (!agent) throw new NotFoundError('Agent not found');
      return agent;
    },

    async update(id: string, input: UpdateAgentInput): Promise<Agent> {
      const agent = await repo.update(id, input);
      await Promise.all([cache.invalidateKey(detailKey(id)), cache.invalidateLists()]);
      return agent;
    },

    async remove(id: string): Promise<void> {
      await repo.delete(id);
      await Promise.all([cache.invalidateKey(detailKey(id)), cache.invalidateLists()]);
    },

    async getStats(): Promise<AgentStats> {
      const version = await cache.getListVersion();
      if (version === null) return repo.getStats();
      return cache.remember(`agents:stats:v${version}`, ttl.list, () => repo.getStats());
    },
  };
}

export const agentService = createAgentService(agentRepository, cacheService, cacheTtl);
