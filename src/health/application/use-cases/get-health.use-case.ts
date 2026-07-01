import { Inject, Injectable } from '@nestjs/common';
import {
  CACHE_HEALTH_CHECKER,
  DATABASE_HEALTH_CHECKER,
  HealthChecker,
} from '../ports/health-checker.port';

@Injectable()
export class GetHealthUseCase {
  constructor(
    @Inject(DATABASE_HEALTH_CHECKER)
    private readonly databaseHealthChecker: HealthChecker,
    @Inject(CACHE_HEALTH_CHECKER)
    private readonly cacheHealthChecker: HealthChecker,
  ) {}

  async execute() {
    const [database, redis] = await Promise.all([
      this.databaseHealthChecker.check(),
      this.cacheHealthChecker.check(),
    ]);

    const status = database.status !== 'error' && redis.status !== 'error' ? 'ok' : 'degraded';

    return {
      status,
      services: {
        database,
        redis,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
