import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DELIVERY_QUEUE } from './application/ports/delivery-queue.port';
import { EVENTS_REPOSITORY } from './application/ports/events.repository';
import { GetEventUseCase } from './application/use-cases/get-event.use-case';
import { IngestEventUseCase } from './application/use-cases/ingest-event.use-case';
import { ListEventsUseCase } from './application/use-cases/list-events.use-case';
import { PrismaEventsRepository } from './infrastructure/persistence/prisma-events.repository';
import { BullmqDeliveryQueue } from './infrastructure/queue/bullmq-delivery.queue';
import { EventsController } from './presentation/http/events.controller';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    SecurityModule,
    BullModule.registerQueue({
      name: 'webhook-deliveries',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 1,
      },
    }),
  ],
  controllers: [EventsController],
  providers: [
    IngestEventUseCase,
    ListEventsUseCase,
    GetEventUseCase,
    {
      provide: EVENTS_REPOSITORY,
      useClass: PrismaEventsRepository,
    },
    {
      provide: DELIVERY_QUEUE,
      useClass: BullmqDeliveryQueue,
    },
  ],
})
export class EventsModule {}
