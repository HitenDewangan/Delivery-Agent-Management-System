import { createCacheService, hashKeyParts } from '../src/services/cache.service';
import { FakeRedis } from './helpers';

describe('hashKeyParts', () => {
  it('is deterministic regardless of key order', () => {
    expect(hashKeyParts({ a: 1, b: 'x' })).toBe(hashKeyParts({ b: 'x', a: 1 }));
  });

  it('differs when any value differs', () => {
    expect(hashKeyParts({ page: 1 })).not.toBe(hashKeyParts({ page: 2 }));
  });

  it('treats undefined and null the same', () => {
    expect(hashKeyParts({ status: undefined })).toBe(hashKeyParts({ status: null }));
  });
});

describe('cache.remember', () => {
  it('loads on a miss, stores with the TTL, then serves the hit without loading', async () => {
    const redis = new FakeRedis();
    const cache = createCacheService(redis);
    const loader = jest.fn().mockResolvedValue({ n: 1 });

    expect(await cache.remember('k', 60, loader)).toEqual({ n: 1 });
    expect(await cache.remember('k', 60, loader)).toEqual({ n: 1 });

    expect(loader).toHaveBeenCalledTimes(1);
    expect(redis.ttls.get('k')).toBe(60);
  });

  it('restores Date fields from cached JSON', async () => {
    const cache = createCacheService(new FakeRedis());
    const date = new Date('2026-01-01T00:00:00.000Z');
    await cache.remember('k', 60, async () => ({ createdAt: date }));
    const hit = await cache.remember('k', 60, async () => ({ createdAt: new Date(0) }));
    expect(hit.createdAt).toBeInstanceOf(Date);
    expect(hit.createdAt.toISOString()).toBe(date.toISOString());
  });

  it('does not cache null results', async () => {
    const redis = new FakeRedis();
    const cache = createCacheService(redis);
    await cache.remember('k', 60, async () => null);
    expect(redis.store.has('k')).toBe(false);
  });

  it('falls back to the loader when Redis is down, without throwing', async () => {
    const redis = new FakeRedis();
    redis.down = true;
    const cache = createCacheService(redis);
    const loader = jest.fn().mockResolvedValue('from-db');

    await expect(cache.remember('k', 60, loader)).resolves.toBe('from-db');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('ignores a corrupt cache entry and reloads', async () => {
    const redis = new FakeRedis();
    redis.store.set('k', '{not json');
    const cache = createCacheService(redis);
    await expect(cache.remember('k', 60, async () => 'fresh')).resolves.toBe('fresh');
  });

  it('propagates loader (database) errors', async () => {
    const cache = createCacheService(new FakeRedis());
    await expect(
      cache.remember('k', 60, async () => {
        throw new Error('db down');
      }),
    ).rejects.toThrow('db down');
  });
});

describe('list versioning', () => {
  it('seeds a version once and keeps it stable', async () => {
    const cache = createCacheService(new FakeRedis());
    const a = await cache.getListVersion();
    const b = await cache.getListVersion();
    expect(a).not.toBeNull();
    expect(a).toBe(b);
  });

  it('changes after invalidateLists', async () => {
    const cache = createCacheService(new FakeRedis());
    const before = await cache.getListVersion();
    await cache.invalidateLists();
    expect(await cache.getListVersion()).not.toBe(before);
  });

  it('returns null (skip cache) when Redis is down, and invalidation does not throw', async () => {
    const redis = new FakeRedis();
    redis.down = true;
    const cache = createCacheService(redis);
    expect(await cache.getListVersion()).toBeNull();
    await expect(cache.invalidateLists()).resolves.toBeUndefined();
    await expect(cache.invalidateKey('x')).resolves.toBeUndefined();
  });
});

describe('invalidateKey', () => {
  it('removes only that key', async () => {
    const redis = new FakeRedis();
    redis.store.set('a', '1');
    redis.store.set('b', '2');
    await createCacheService(redis).invalidateKey('a');
    expect([...redis.store.keys()]).toEqual(['b']);
  });
});
