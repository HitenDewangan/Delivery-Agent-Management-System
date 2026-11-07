import { createHash } from 'node:crypto';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';

/** The small slice of a Redis client the cache needs. Makes the service testable. */
export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
}

const DATE_KEYS = new Set(['createdAt', 'updatedAt']);

// JSON turns Dates into strings; restore them so cached values match DB-backed ones.
function reviveDates(key: string, value: unknown): unknown {
  return DATE_KEYS.has(key) && typeof value === 'string' ? new Date(value) : value;
}

export function hashKeyParts(parts: Record<string, unknown>): string {
  const canonical = JSON.stringify(
    Object.keys(parts)
      .sort()
      .map((k) => [k, parts[k] ?? null]),
  );
  return createHash('sha1').update(canonical).digest('hex').slice(0, 16);
}

export function createCacheService(client: CacheClient) {
  const VERSION_KEY = 'agents:list:version';

  /**
   * Redis is never the source of truth: every operation swallows Redis errors,
   * logs them, and lets the caller continue with PostgreSQL.
   */
  async function safe<T>(op: string, key: string, fn: () => Promise<T>): Promise<T | undefined> {
    try {
      return await fn();
    } catch (err) {
      logger.warn('cache error, falling back to database', {
        op,
        key,
        error: (err as Error).message,
      });
      return undefined;
    }
  }

  async function getJson<T>(key: string): Promise<T | null | undefined> {
    // undefined = Redis failed, null = clean miss, T = hit
    const raw = await safe('get', key, () => client.get(key));
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    try {
      return JSON.parse(raw, reviveDates) as T;
    } catch {
      logger.warn('cache entry is not valid JSON, ignoring', { key });
      return null;
    }
  }

  async function setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const ok = await safe('set', key, () =>
      client.set(key, JSON.stringify(value), 'EX', ttlSeconds),
    );
    if (ok !== undefined) logger.info('cache set', { key, ttlSeconds });
  }

  return {
    /**
     * Cache-aside: return the cached value, otherwise run `loader` (the database
     * read), store the result and return it. A Redis failure never fails the request.
     */
    async remember<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
      const cached = await getJson<T>(key);
      if (cached !== null && cached !== undefined) {
        logger.info('cache hit', { key });
        return cached;
      }
      if (cached === null) logger.info('cache miss', { key });

      const value = await loader();
      // Skip when Redis is failing, and never cache "not found" results.
      if (cached !== undefined && value !== null && value !== undefined) {
        await setJson(key, value, ttlSeconds);
      }
      return value;
    },

    /**
     * List/stat cache keys embed a version number. Bumping it invalidates every
     * list, filter and page variant at once without using KEYS or SCAN; the old
     * entries are simply never read again and expire through their TTL.
     * Returns null when Redis is unavailable, which tells callers to skip the cache.
     */
    async getListVersion(): Promise<string | null> {
      const result = await safe('version', VERSION_KEY, async () => {
        const existing = await client.get(VERSION_KEY);
        if (existing !== null) return existing;
        // Seed with a timestamp so an evicted counter can never reuse an old version.
        await client.set(VERSION_KEY, String(Date.now()), 'NX');
        return (await client.get(VERSION_KEY)) ?? null;
      });
      return result ?? null;
    },

    async invalidateLists(): Promise<void> {
      const version = await safe('invalidate', VERSION_KEY, () => client.incr(VERSION_KEY));
      if (version !== undefined) logger.info('cache invalidated', { scope: 'lists', version });
    },

    async invalidateKey(key: string): Promise<void> {
      const deleted = await safe('del', key, () => client.del(key));
      if (deleted !== undefined) logger.info('cache invalidated', { scope: 'key', key });
    },
  };
}

export type CacheService = ReturnType<typeof createCacheService>;

export const cacheTtl = {
  list: env.CACHE_TTL_LIST_SECONDS,
  detail: env.CACHE_TTL_DETAIL_SECONDS,
};

export const cacheService = createCacheService({
  get: (key) => redis.get(key),
  set: (key, value, ...args) =>
    (redis.set as (...a: unknown[]) => Promise<unknown>)(key, value, ...args),
  del: (...keys) => redis.del(...keys),
  incr: (key) => redis.incr(key),
});
