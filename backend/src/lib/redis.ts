import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
  // Fail fast instead of queueing commands while Redis is down; callers fall back to PostgreSQL.
  enableOfflineQueue: false,
  commandTimeout: 1000,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

redis.on('error', (err: Error) => {
  logger.warn('Redis connection error', { error: err.message });
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    logger.info('Redis connected');
  } catch (err) {
    // Redis is not the source of truth: the API must still boot without it.
    logger.warn('Redis unavailable at startup', { error: (err as Error).message });
  }
}

export async function checkRedis(): Promise<boolean> {
  try {
    return (await redis.ping()) === 'PONG';
  } catch {
    return false;
  }
}
