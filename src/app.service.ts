import 'dotenv/config';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

@Injectable()
export class AppService implements OnModuleDestroy {
  private prisma?: PrismaClient;
  private redis?: Redis;

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
    this.redis?.disconnect();
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
      const redis = this.getRedisClient();

      if (redis.status === 'wait') {
        await redis.connect();
      }

      const response = await redis.ping();
      await redis.set('webhook-engine:boot', new Date().toISOString());

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

  private getRedisClient() {
    if (!this.redis) {
      this.redis = new Redis({
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: Number(process.env.REDIS_PORT ?? 6379),
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      });
    }

    return this.redis;
  }
}
