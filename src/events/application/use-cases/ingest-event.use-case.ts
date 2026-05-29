import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DELIVERY_QUEUE,
  DeliveryQueue,
} from '../ports/delivery-queue.port';
import {
  EVENTS_REPOSITORY,
  EventsRepository,
} from '../ports/events.repository';

export type IngestEventCommand = {
  tenantId: string;
  idempotencyKey: string;
  type: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class IngestEventUseCase {
  private readonly logger = new Logger(IngestEventUseCase.name);

  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
    @Inject(DELIVERY_QUEUE)
    private readonly deliveryQueue: DeliveryQueue,
  ) {}

  async execute(command: IngestEventCommand) {
    try {
      const result = await this.eventsRepository.createForTenant(command);

      await this.deliveryQueue.enqueueDeliveries(result.deliveryIds);

      this.logger.log(
        `Event ${result.event.id} ingested. Deliveries queued: ${result.deliveryIds.length}`,
      );

      return {
        message: 'Event accepted for processing',
        eventId: result.event.id,
        deliveriesCreated: result.deliveryIds.length,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        this.logger.warn(`Idempotency hit for key: ${command.idempotencyKey}`);
        return {
          message: 'Event already accepted',
          idempotencyKey: command.idempotencyKey,
        };
      }

      if (error.code === 'TENANT_NOT_FOUND') {
        throw new NotFoundException('Tenant not found');
      }

      throw error;
    }
  }
}
