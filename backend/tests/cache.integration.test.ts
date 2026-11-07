import Redis from 'ioredis';
import { createCacheService, type CacheService } from '../src/services/cache.service';

// Runs against a real Redis only when REDIS_INTEGRATION_URL is set, e.g.
//   REDIS_INTEGRATION_URL=redis://localhost:6379 npm test
const url = process.env.REDIS_INTEGRATION_URL;
const describeIf = url ? describe : describe.skip;

describeIf('cache service against real Redis', () => {
  // Created in beforeAll: a skipped describe still runs its body, and that must not open sockets.
  let client: Redis;
  let cache: CacheService;
  const key = `test:integration:${Date.now()}`;

  beforeAll(() => {
    client = new Redis(url as string);
    cache = createCacheService({
      get: (k) => client.get(k),
      set: (k, v, ...a) => (client.set as (...x: unknown[]) => Promise<unknown>)(k, v, ...a),
      del: (...k) => client.del(...k),
      incr: (k) => client.incr(k),
    });
  });

  afterAll(async () => {
    await client.del(key);
    await client.quit();
  });

  it('stores values with a real TTL and serves hits', async () => {
    const loader = jest.fn().mockResolvedValue({ ok: true });
    await cache.remember(key, 30, loader);
    await cache.remember(key, 30, loader);
    expect(loader).toHaveBeenCalledTimes(1);
    const ttl = await client.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(30);
  });

  it('bumps the list version atomically', async () => {
    const before = await cache.getListVersion();
    await cache.invalidateLists();
    expect(await cache.getListVersion()).not.toBe(before);
  });

  it('removes a key on invalidateKey', async () => {
    await cache.invalidateKey(key);
    expect(await client.exists(key)).toBe(0);
  });
});
