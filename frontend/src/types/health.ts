export type DependencyState = 'up' | 'down';

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  uptimeSeconds: number;
  timestamp: string;
  dependencies: { postgres: DependencyState; redis: DependencyState };
}
