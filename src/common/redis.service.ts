import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from './config.service';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      ...config.redisConfig,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: null,
    });
  }

  async onModuleInit() {
    if (this.status === 'wait') {
      await this.connect();
    }
  }

  onModuleDestroy() {
    this.disconnect();
  }
}
