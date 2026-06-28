export const RATE_LIMITER = Symbol('RATE_LIMITER');

export type RateLimitResult = {
  exceeded: boolean;
  delayMs: number;
  currentRequests: number;
};

export interface RateLimiter {
  checkRateLimit(scope: string, limit: number): Promise<RateLimitResult>;
}
