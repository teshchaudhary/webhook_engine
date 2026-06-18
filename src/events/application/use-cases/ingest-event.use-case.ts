import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DELIVERY_QUEUE, DeliveryQueue } from '../ports/delivery-queue.port';
import { EVENTS_REPOSITORY, EventsRepository } from '../ports/events.repository';
import { MetricsService } from '../../../common/metrics.service';

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
    private readonly metrics: MetricsService,
  ) {}

  async execute(command: IngestEventCommand) {
    try {
      const result = await this.eventsRepository.createForTenant(command);
      this.metrics.increment('events_accepted_total');
      this.metrics.increment('deliveries_created_total', result.deliveryIds.length);

      try {
        await this.deliveryQueue.publishPending();
      } catch (queueError) {
        this.logger.error(
          'Immediate queue publication failed; the outbox publisher will retry',
          queueError instanceof Error ? queueError.stack : undefined,
        );
        this.metrics.increment('outbox_publish_errors_total');
      }

      this.logger.log(
        `Event ${result.event.id} ingested. Deliveries queued: ${result.deliveryIds.length}`,
      );

      return {
        message: 'Event accepted for processing',
        eventId: result.event.id,
        deliveriesCreated: result.deliveryIds.length,
      };
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code === 'P2002') {
        this.metrics.increment('events_idempotent_replays_total');
        this.logger.warn(`Idempotency hit for key: ${command.idempotencyKey}`);
        return {
          message: 'Event already accepted',
          idempotencyKey: command.idempotencyKey,
        };
      }

      if (code === 'TENANT_NOT_FOUND') {
        throw new NotFoundException('Tenant not found');
      }

      throw error;
    }
  }
}
