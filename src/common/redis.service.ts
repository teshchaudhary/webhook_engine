import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor() {
    super({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
    });
  }

  onModuleDestroy() {
    this.disconnect();
  }
}
