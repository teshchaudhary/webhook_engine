import { Module } from '@nestjs/common';
import { DELIVERY_QUEUE } from './application/ports/delivery-queue.port';
import { EVENTS_REPOSITORY } from './application/ports/events.repository';
import { GetEventUseCase } from './application/use-cases/get-event.use-case';
import { IngestEventUseCase } from './application/use-cases/ingest-event.use-case';
import { ListEventsUseCase } from './application/use-cases/list-events.use-case';
import { PrismaEventsRepository } from './infrastructure/persistence/prisma-events.repository';
import { DeliveryOutboxSchedulerService } from './infrastructure/queue/delivery-outbox-scheduler.service';
import { DeliveryMaintenanceService } from './infrastructure/queue/delivery-maintenance.service';
import { DeliveryOutboxPublisherService } from './infrastructure/queue/delivery-outbox-publisher.service';
import { EventsController } from './presentation/http/events.controller';
import { SecurityModule } from '../security/security.module';
import { WebhookDeliveryQueueModule } from '../queue/webhook-delivery-queue.module';

@Module({
  imports: [
    SecurityModule,
    WebhookDeliveryQueueModule,
  ],
  controllers: [EventsController],
  providers: [
    IngestEventUseCase,
    ListEventsUseCase,
    GetEventUseCase,
    DeliveryMaintenanceService,
    DeliveryOutboxPublisherService,
    {
      provide: EVENTS_REPOSITORY,
      useClass: PrismaEventsRepository,
    },
    {
      provide: DELIVERY_QUEUE,
      useClass: DeliveryOutboxSchedulerService,
    },
  ],
})
export class EventsModule {}
