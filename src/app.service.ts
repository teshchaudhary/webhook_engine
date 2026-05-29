import 'dotenv/config';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { RedisService } from './common/redis.service';

@Injectable()
export class AppService implements OnModuleDestroy {
  private prisma?: PrismaClient;

  constructor(private readonly redis: RedisService) {}

  getRoot() {
    return {
      name: 'webhook-engine',
      status: 'ok',
      runtime: 'foundation',
    };
  }

  async getHealth() {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status =
      database.status === 'ok' && redis.status === 'ok' ? 'ok' : 'degraded';

    return {
      status,
      services: {
        database,
        redis,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async onModuleDestroy() {
    await this.prisma?.$disconnect();
  }

  private async checkDatabase() {
    if (process.env.NODE_ENV === 'test') {
      return {
        status: 'skipped',
        detail: 'database check disabled in test environment',
      };
    }

    try {
      const prisma = this.getPrismaClient();
      await prisma.$queryRawUnsafe('SELECT 1');

      return {
        status: 'ok',
      };
    } catch (error) {
      return {
        status: 'error',
        detail: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private async checkRedis() {
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

  private getPrismaClient() {
    if (!this.prisma) {
      const connectionString = process.env.DATABASE_URL;

      if (!connectionString) {
        throw new Error('DATABASE_URL is not configured');
      }

      const adapter = new PrismaPg({ connectionString });
      this.prisma = new PrismaClient({ adapter });
    }

    return this.prisma;
  }
}
