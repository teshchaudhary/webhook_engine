export const DATABASE_HEALTH_CHECKER = Symbol('DATABASE_HEALTH_CHECKER');
export const CACHE_HEALTH_CHECKER = Symbol('CACHE_HEALTH_CHECKER');

export type HealthCheckResult = {
  status: 'ok' | 'error' | 'skipped';
  detail?: string;
};

export interface HealthChecker {
  check(): Promise<HealthCheckResult>;
}
