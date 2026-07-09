import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ConfigService } from '../../../common/config.service';
import {
  HealthChecker,
  HealthCheckResult,
} from '../../application/ports/health-checker.port';

@Injectable()
export class PrismaHealthChecker implements HealthChecker {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    if (this.config.isTest) {
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
