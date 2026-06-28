import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../common/redis.service';
import { RateLimiter, RateLimitResult } from '../../application/ports/rate-limiter.port';

@Injectable()
export class RedisRateLimiterAdapter implements RateLimiter {
  constructor(private readonly redis: RedisService) {}

  async checkRateLimit(scope: string, limit: number): Promise<RateLimitResult> {
    const key = `rate-limit:${scope}`;
    const now = Date.now();
    const script = `
      local values = redis.call('HMGET', KEYS[1], 'tokens', 'updatedAt')
      local tokens = tonumber(values[1]) or tonumber(ARGV[1])
      local updatedAt = tonumber(values[2]) or tonumber(ARGV[2])
      local elapsed = math.max(0, tonumber(ARGV[2]) - updatedAt)
      tokens = math.min(tonumber(ARGV[1]), tokens + elapsed * tonumber(ARGV[1]) / 1000)
      local allowed = tokens >= 1
      local delay = 0
      if allowed then
        tokens = tokens - 1
      else
        delay = math.ceil((1 - tokens) * 1000 / tonumber(ARGV[1]))
      end
      redis.call('HMSET', KEYS[1], 'tokens', tokens, 'updatedAt', ARGV[2])
      redis.call('PEXPIRE', KEYS[1], 2000)
      return { allowed and 1 or 0, delay, math.ceil(tonumber(ARGV[1]) - tokens) }
    `;
    const result = (await this.redis.eval(script, 1, key, limit, now)) as [number, number, number];
    return {
      exceeded: result[0] === 0,
      delayMs: Number(result[1]),
      currentRequests: Number(result[2]),
    };
  }
}
