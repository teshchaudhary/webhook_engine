import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { DELIVERIES_REPOSITORY } from './application/ports/deliveries.repository';
import { DELIVERY_REPLAY_QUEUE } from './application/ports/delivery-replay-queue.port';
import { GetDeliveryUseCase } from './application/use-cases/get-delivery.use-case';
import { ListDeliveriesUseCase } from './application/use-cases/list-deliveries.use-case';
import { ReplayDeliveryUseCase } from './application/use-cases/replay-delivery.use-case';
import { PrismaDeliveriesRepository } from './infrastructure/persistence/prisma-deliveries.repository';
import { BullmqDeliveryReplayQueue } from './infrastructure/queue/bullmq-delivery-replay.queue';
import { DeliveriesController } from './presentation/http/deliveries.controller';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'webhook-deliveries',
    }),
  ],
  controllers: [DeliveriesController],
  providers: [
    ListDeliveriesUseCase,
    GetDeliveryUseCase,
    ReplayDeliveryUseCase,
    {
      provide: DELIVERIES_REPOSITORY,
      useClass: PrismaDeliveriesRepository,
    },
    {
      provide: DELIVERY_REPLAY_QUEUE,
      useClass: BullmqDeliveryReplayQueue,
    },
  ],
})
export class DeliveriesModule {}
