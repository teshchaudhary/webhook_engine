import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DeliveryQueue } from '../../application/ports/delivery-queue.port';
import { ConfigService } from '../../../common/config.service';
import { DeliveryOutboxPublisherService } from './delivery-outbox-publisher.service';

@Injectable()
export class DeliveryOutboxSchedulerService
  implements DeliveryQueue, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(DeliveryOutboxSchedulerService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly publisher: DeliveryOutboxPublisherService,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.runPublisher(), this.config.outboxPollInterval);
    this.timer.unref();
    void this.runPublisher();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async publishPending(): Promise<void> {
    await this.publisher.publishPending();
  }

  private async runPublisher(): Promise<void> {
    try {
      await this.publishPending();
    } catch (error) {
      this.logger.error(
        'Outbox publication failed; it will be retried',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

