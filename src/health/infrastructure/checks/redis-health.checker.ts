import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../common/redis.service';
import {
  HealthChecker,
  HealthCheckResult,
} from '../../application/ports/health-checker.port';

@Injectable()
export class RedisHealthChecker implements HealthChecker {
  constructor(private readonly redis: RedisService) {}

  async check(): Promise<HealthCheckResult> {
    if (process.env.NODE_ENV === 'test') {
      return {
        status: 'skipped',
        detail: 'redis check disabled in test environment',
      };
    }

    try {
      if (this.redis.status === 'wait') {
        await this.redis.connect();
      }

      const response = await this.redis.ping();
      await this.redis.set('webhook-engine:boot', new Date().toISOString());

      return {
        status: response === 'PONG' ? 'ok' : 'error',
      };
    } catch (error) {
      return {
        status: 'error',
        detail: error instanceof Error ? error.message : 'Unknown redis error',
      };
    }
  }
}
