import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DispatcherWorker } from './dispatcher.worker';
import { SecurityModule } from '../security/security.module';
import { RateLimiterService } from './services/rate-limiter.service';
import { DeliveryExecutorService } from './services/delivery-executor.service';
import { HttpDeliveryChannel } from './services/http-delivery-channel.service';

@Module({
  imports: [
    SecurityModule,
    BullModule.registerQueue({
      name: 'webhook-deliveries',
    }),
  ],
  providers: [
    DispatcherWorker,
    RateLimiterService,
    DeliveryExecutorService,
    HttpDeliveryChannel,
  ],
})
export class DispatcherModule {}