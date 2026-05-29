import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../common/redis.service';
import { RateLimiter, RateLimitResult } from '../../application/ports/rate-limiter.port';

@Injectable()
export class RedisRateLimiterAdapter implements RateLimiter {
  constructor(private readonly redis: RedisService) {}

  async checkRateLimit(
    tenantId: string,
    limit: number,
  ): Promise<RateLimitResult> {
    const currentSecond = Math.floor(Date.now() / 1000);
    const rateLimitKey = `rate-limit:${tenantId}:${currentSecond}`;

    const currentRequests = await this.redis.incr(rateLimitKey);
    if (currentRequests === 1) {
      await this.redis.expire(rateLimitKey, 2);
    }

    if (currentRequests > limit) {
      const delayMs = Math.max(1000 - (Date.now() % 1000), 100);
      return { exceeded: true, delayMs, currentRequests };
    }

    return { exceeded: false, delayMs: 0, currentRequests };
  }
}
