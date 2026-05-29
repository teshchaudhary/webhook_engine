import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DELAYED_DELIVERY_QUEUE,
  DelayedDeliveryQueue,
} from '../ports/delayed-delivery-queue.port';
import {
  DELIVERY_CHANNEL,
  DeliveryChannel,
} from '../ports/delivery-channel.port';
import {
  DISPATCH_DELIVERIES_REPOSITORY,
  DispatchDeliveriesRepository,
} from '../ports/dispatch-deliveries.repository';
import { RATE_LIMITER, RateLimiter } from '../ports/rate-limiter.port';
import { DeliveryExecutorService } from '../services/delivery-executor.service';

@Injectable()
export class ProcessDeliveryUseCase {
  private readonly logger = new Logger(ProcessDeliveryUseCase.name);

  constructor(
    @Inject(DISPATCH_DELIVERIES_REPOSITORY)
    private readonly deliveriesRepository: DispatchDeliveriesRepository,
    @Inject(RATE_LIMITER)
    private readonly rateLimiter: RateLimiter,
    @Inject(DELAYED_DELIVERY_QUEUE)
    private readonly delayedDeliveryQueue: DelayedDeliveryQueue,
    @Inject(DELIVERY_CHANNEL)
    private readonly deliveryChannel: DeliveryChannel,
    private readonly executor: DeliveryExecutorService,
  ) {}

  async execute(deliveryId: string): Promise<void> {
    this.logger.log(`Processing delivery job for delivery ID: ${deliveryId}`);

    const delivery = await this.deliveriesRepository.findById(deliveryId);

    if (!delivery) {
      this.logger.error(`Delivery ${deliveryId} not found`);
      return;
    }

    if (delivery.status === 'SUCCESS' || delivery.status === 'DLQ') {
      this.logger.log(
        `Delivery ${deliveryId} is already ${delivery.status}, skipping.`,
      );
      return;
    }

    const tenant = delivery.event.tenant;
    const rateLimit = tenant.rateLimit ?? 10;
    const { exceeded, delayMs } = await this.rateLimiter.checkRateLimit(
      tenant.id,
      rateLimit,
    );

    if (exceeded) {
      const nextAttemptAt = new Date(Date.now() + delayMs);

      this.logger.warn(
        `Rate limit exceeded for tenant ${tenant.name} (${tenant.id}). Delaying delivery ${deliveryId} by ${delayMs}ms.`,
      );

      await this.deliveriesRepository.markRateLimited(deliveryId, nextAttemptAt);
      await this.delayedDeliveryQueue.enqueueDelayed(deliveryId, delayMs);
      return;
    }

    await this.executor.execute(delivery, this.deliveryChannel);
  }
}
