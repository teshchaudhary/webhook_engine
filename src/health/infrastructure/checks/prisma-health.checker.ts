import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  HealthChecker,
  HealthCheckResult,
} from '../../application/ports/health-checker.port';

@Injectable()
export class PrismaHealthChecker implements HealthChecker {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    if (process.env.NODE_ENV === 'test') {
      return {
        status: 'skipped',
        detail: 'database check disabled in test environment',
      };
    }

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');

      return {
        status: 'ok',
      };
    } catch (error) {
      return {
        status: 'error',
        detail:
          error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }
}
