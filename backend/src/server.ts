import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { pgPool } from './lib/postgres';
import { connectRedis, redis } from './lib/redis';

async function main(): Promise<void> {
  await connectRedis();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info('Backend listening', { port: env.PORT, env: env.NODE_ENV });
  });

  const shutdown = (signal: string): void => {
    logger.info('Shutting down', { signal });
    server.close(() => {
      void Promise.allSettled([pgPool.end(), redis.quit()]).then(() => process.exit(0));
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  logger.error('Failed to start', { error: (err as Error).message });
  process.exit(1);
});
