import { checkPostgres } from '../lib/postgres';
import { checkRedis } from '../lib/redis';

type DependencyState = 'up' | 'down';

interface HealthReport {
  httpStatus: 200 | 503;
  body: {
    status: 'ok' | 'degraded' | 'error';
    uptimeSeconds: number;
    timestamp: string;
    dependencies: { postgres: DependencyState; redis: DependencyState };
  };
}

export const healthService = {
  async check(): Promise<HealthReport> {
    const [pg, rd] = await Promise.all([checkPostgres(), checkRedis()]);

    // PostgreSQL is the source of truth, so it being down is a hard failure.
    // Redis is only a cache, so it being down is "degraded" but still serving.
    const status = !pg ? 'error' : rd ? 'ok' : 'degraded';

    return {
      httpStatus: pg ? 200 : 503,
      body: {
        status,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        dependencies: { postgres: pg ? 'up' : 'down', redis: rd ? 'up' : 'down' },
      },
    };
  },
};
