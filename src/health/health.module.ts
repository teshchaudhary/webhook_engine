import { Module } from '@nestjs/common';
import {
  CACHE_HEALTH_CHECKER,
  DATABASE_HEALTH_CHECKER,
} from './application/ports/health-checker.port';
import { GetHealthUseCase } from './application/use-cases/get-health.use-case';
import { PrismaHealthChecker } from './infrastructure/checks/prisma-health.checker';
import { RedisHealthChecker } from './infrastructure/checks/redis-health.checker';
import { HealthController } from './presentation/http/health.controller';

@Module({
  controllers: [HealthController],
  providers: [
    GetHealthUseCase,
    {
      provide: DATABASE_HEALTH_CHECKER,
      useClass: PrismaHealthChecker,
    },
    {
      provide: CACHE_HEALTH_CHECKER,
      useClass: RedisHealthChecker,
    },
  ],
})
export class HealthModule {}
