// The service module imports the real repository (which needs the generated Prisma client).
// These tests inject their own fake repository, so the import is stubbed out.
jest.mock('../src/repositories/agent.repository', () => ({ agentRepository: {} }));

import { createAgentService } from '../src/services/agent.service';
import { createCacheService } from '../src/services/cache.service';
import { ConflictError, NotFoundError } from '../src/utils/errors';
import { AGENT_ID, FakeRedis, makeAgent } from './helpers';

const ttl = { list: 60, detail: 120 };

function setup() {
  const redis = new FakeRedis();
  const repo = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getStats: jest.fn(),
  };
  const service = createAgentService(repo, createCacheService(redis), ttl);
  return { redis, repo, service };
}

const params = { page: 1, limit: 10 };

describe('list caching', () => {
  it('hits the database once, then serves repeats from Redis', async () => {
    const { repo, service } = setup();
    repo.findMany.mockResolvedValue({ items: [makeAgent()], total: 1 });

    const first = await service.list(params);
    const second = await service.list(params);

    expect(repo.findMany).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(second.items[0]?.createdAt).toBeInstanceOf(Date);
  });

  it('uses a separate cache entry per filter / page combination', async () => {
    const { repo, service } = setup();
    repo.findMany.mockResolvedValue({ items: [], total: 0 });

    await service.list(params);
    await service.list({ ...params, page: 2 });
    await service.list({ ...params, status: 'ACTIVE' });
    await service.list({ ...params, search: 'asha' });
    await service.list({ ...params, serviceArea: 'North' });
    expect(repo.findMany).toHaveBeenCalledTimes(5);

    await service.list({ ...params, search: 'ASHA' }); // case-insensitive search shares an entry
    expect(repo.findMany).toHaveBeenCalledTimes(5);
  });

  it('gives each cached list a TTL', async () => {
    const { redis, repo, service } = setup();
    repo.findMany.mockResolvedValue({ items: [], total: 0 });
    await service.list(params);
    const key = [...redis.ttls.keys()].find((k) => k.startsWith('agents:list:v'));
    expect(redis.ttls.get(key as string)).toBe(60);
  });
});

describe('detail caching', () => {
  it('caches a found agent and serves the second read from Redis', async () => {
    const { repo, service } = setup();
    repo.findById.mockResolvedValue(makeAgent());
    await service.getById(AGENT_ID);
    await service.getById(AGENT_ID);
    expect(repo.findById).toHaveBeenCalledTimes(1);
  });

  it('throws NotFound and does not cache a missing agent', async () => {
    const { redis, repo, service } = setup();
    repo.findById.mockResolvedValue(null);
    await expect(service.getById(AGENT_ID)).rejects.toBeInstanceOf(NotFoundError);
    expect(redis.store.has(`agents:detail:${AGENT_ID}`)).toBe(false);
  });
});

describe('invalidation after mutations', () => {
  it('create invalidates all list variants', async () => {
    const { repo, service } = setup();
    repo.findMany.mockResolvedValue({ items: [], total: 0 });
    await service.list(params);
    await service.list({ ...params, status: 'ACTIVE' });

    repo.create.mockResolvedValue(makeAgent());
    await service.create({ fullName: 'A', phone: '1', email: 'a@a.a', serviceArea: 'X' });

    await service.list(params);
    await service.list({ ...params, status: 'ACTIVE' });
    expect(repo.findMany).toHaveBeenCalledTimes(4); // both variants reloaded
  });

  it('update refreshes the detail entry and the lists', async () => {
    const { redis, repo, service } = setup();
    repo.findById.mockResolvedValue(makeAgent());
    repo.findMany.mockResolvedValue({ items: [], total: 0 });
    await service.getById(AGENT_ID);
    await service.list(params);

    repo.update.mockResolvedValue(makeAgent({ status: 'INACTIVE' }));
    await service.update(AGENT_ID, { status: 'INACTIVE' });

    expect(redis.store.has(`agents:detail:${AGENT_ID}`)).toBe(false);
    repo.findById.mockResolvedValue(makeAgent({ status: 'INACTIVE' }));
    expect((await service.getById(AGENT_ID)).status).toBe('INACTIVE');
    await service.list(params);
    expect(repo.findMany).toHaveBeenCalledTimes(2);
  });

  it('delete removes the detail entry and invalidates lists and stats', async () => {
    const { redis, repo, service } = setup();
    repo.findById.mockResolvedValue(makeAgent());
    repo.getStats.mockResolvedValue({ total: 1 });
    await service.getById(AGENT_ID);
    await service.getStats();

    repo.delete.mockResolvedValue(undefined);
    await service.remove(AGENT_ID);

    expect(redis.store.has(`agents:detail:${AGENT_ID}`)).toBe(false);
    await service.getStats();
    expect(repo.getStats).toHaveBeenCalledTimes(2);
  });

  it('does NOT invalidate when the database operation fails', async () => {
    const { redis, repo, service } = setup();
    repo.findById.mockResolvedValue(makeAgent());
    await service.getById(AGENT_ID);
    const versionBefore = await createCacheService(redis).getListVersion();

    repo.update.mockRejectedValue(new ConflictError('duplicate'));
    await expect(service.update(AGENT_ID, { phone: '2' })).rejects.toBeInstanceOf(ConflictError);
    repo.delete.mockRejectedValue(new NotFoundError());
    await expect(service.remove(AGENT_ID)).rejects.toBeInstanceOf(NotFoundError);

    expect(redis.store.has(`agents:detail:${AGENT_ID}`)).toBe(true);
    expect(await createCacheService(redis).getListVersion()).toBe(versionBefore);
  });
});

describe('Redis outage', () => {
  it('serves every read from the database and mutations still succeed', async () => {
    const { redis, repo, service } = setup();
    redis.down = true;
    repo.findMany.mockResolvedValue({ items: [makeAgent()], total: 1 });
    repo.findById.mockResolvedValue(makeAgent());
    repo.getStats.mockResolvedValue({ total: 1 });
    repo.create.mockResolvedValue(makeAgent());
    repo.update.mockResolvedValue(makeAgent());
    repo.delete.mockResolvedValue(undefined);

    await expect(service.list(params)).resolves.toBeDefined();
    await expect(service.list(params)).resolves.toBeDefined();
    await expect(service.getById(AGENT_ID)).resolves.toBeDefined();
    await expect(service.getStats()).resolves.toBeDefined();
    await expect(
      service.create({ fullName: 'A', phone: '1', email: 'a@a.a', serviceArea: 'X' }),
    ).resolves.toBeDefined();
    await expect(service.update(AGENT_ID, { notes: 'x' })).resolves.toBeDefined();
    await expect(service.remove(AGENT_ID)).resolves.toBeUndefined();

    expect(repo.findMany).toHaveBeenCalledTimes(2); // no caching while Redis is down
  });

  it('recovers and caches again once Redis returns', async () => {
    const { redis, repo, service } = setup();
    repo.findMany.mockResolvedValue({ items: [], total: 0 });
    redis.down = true;
    await service.list(params);
    redis.down = false;
    await service.list(params);
    await service.list(params);
    expect(repo.findMany).toHaveBeenCalledTimes(2);
  });
});
