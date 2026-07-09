import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { readIsApiOnly } from '../common/config.service';
import { SecurityModule } from '../security/security.module';
import { DELIVERY_CHANNEL } from './application/ports/delivery-channel.port';
import { DISPATCH_DELIVERIES_REPOSITORY } from './application/ports/dispatch-deliveries.repository';
import { RATE_LIMITER } from './application/ports/rate-limiter.port';
import { DeliveryExecutorService } from './application/services/delivery-executor.service';
import { ProcessDeliveryUseCase } from './application/use-cases/process-delivery.use-case';
import { HttpDeliveryChannelAdapter } from './infrastructure/http/http-delivery-channel.adapter';
import { PrismaDispatchDeliveriesRepository } from './infrastructure/persistence/prisma-dispatch-deliveries.repository';
import { DispatcherWorker } from './infrastructure/queue/dispatcher.worker';
import { RedisRateLimiterAdapter } from './infrastructure/rate-limiting/redis-rate-limiter.adapter';

const workerProviders = readIsApiOnly() ? [] : [DispatcherWorker];

@Module({
  imports: [
    SecurityModule,
    BullModule.registerQueue({
      name: 'webhook-deliveries',
    }),
  ],
  providers: [
    ...workerProviders,
    ProcessDeliveryUseCase,
    DeliveryExecutorService,
    {
      provide: DISPATCH_DELIVERIES_REPOSITORY,
      useClass: PrismaDispatchDeliveriesRepository,
    },
    {
      provide: RATE_LIMITER,
      useClass: RedisRateLimiterAdapter,
    },
    {
      provide: DELIVERY_CHANNEL,
      useClass: HttpDeliveryChannelAdapter,
    },
  ],
})
export class DispatcherModule {}
