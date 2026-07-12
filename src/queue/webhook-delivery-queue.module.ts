import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '../common/config.service';
import { WEBHOOK_DELIVERY_QUEUE } from './webhook-delivery-queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: config.redisConfig,
      }),
    }),
    BullModule.registerQueue({
      name: WEBHOOK_DELIVERY_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 1,
      },
    }),
  ],
  exports: [BullModule],
})
export class WebhookDeliveryQueueModule {}

