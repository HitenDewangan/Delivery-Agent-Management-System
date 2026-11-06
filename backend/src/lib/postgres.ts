import { Pool } from 'pg';
import { env } from '../config/env';
import { logger } from './logger';

export const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 3000,
});

// Without this handler, an idle client dropped by the server (e.g. DB restart)
// emits an unhandled 'error' event and crashes the process.
pgPool.on('error', (err: Error) => {
  logger.warn('Postgres pool error', { error: err.message });
});

export async function checkPostgres(): Promise<boolean> {
  try {
    await pgPool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
