import type { Agent } from '../src/types/agent';

export const AGENT_ID = '3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b';

export function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: AGENT_ID,
    fullName: 'Asha Rao',
    phone: '+919876543210',
    email: 'asha@example.com',
    serviceArea: 'Indiranagar',
    status: 'ACTIVE',
    vehicleType: 'MOTORCYCLE',
    notes: null,
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: new Date('2026-01-01T10:00:00.000Z'),
    ...overrides,
  };
}

import type { CacheClient } from '../src/services/cache.service';

/** In-memory stand-in for Redis. Set `down = true` to simulate an outage. */
export class FakeRedis implements CacheClient {
  store = new Map<string, string>();
  ttls = new Map<string, number>();
  down = false;

  private guard(): void {
    if (this.down) throw new Error('Redis is down');
  }

  async get(key: string): Promise<string | null> {
    this.guard();
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, ...args: (string | number)[]): Promise<unknown> {
    this.guard();
    if (args.includes('NX') && this.store.has(key)) return null;
    this.store.set(key, value);
    const exIndex = args.indexOf('EX');
    if (exIndex >= 0) this.ttls.set(key, Number(args[exIndex + 1]));
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    this.guard();
    return keys.filter((k) => this.store.delete(k)).length;
  }

  async incr(key: string): Promise<number> {
    this.guard();
    const next = Number(this.store.get(key) ?? 0) + 1;
    this.store.set(key, String(next));
    return next;
  }
}
