import { Inject, Injectable, Logger } from '@nestjs/common';
import { DELIVERY_CHANNEL, DeliveryChannel } from '../ports/delivery-channel.port';
import {
  DISPATCH_DELIVERIES_REPOSITORY,
  DispatchDeliveriesRepository,
} from '../ports/dispatch-deliveries.repository';
import { RATE_LIMITER, RateLimiter } from '../ports/rate-limiter.port';
import { DeliveryExecutorService } from '../services/delivery-executor.service';
import { MetricsService } from '../../../common/metrics.service';

@Injectable()
export class ProcessDeliveryUseCase {
  private readonly logger = new Logger(ProcessDeliveryUseCase.name);

  constructor(
    @Inject(DISPATCH_DELIVERIES_REPOSITORY)
    private readonly deliveriesRepository: DispatchDeliveriesRepository,
    @Inject(RATE_LIMITER)
    private readonly rateLimiter: RateLimiter,
    @Inject(DELIVERY_CHANNEL)
    private readonly deliveryChannel: DeliveryChannel,
    private readonly executor: DeliveryExecutorService,
    private readonly metrics: MetricsService,
  ) {}

  async execute(deliveryId: string, expectedAttempt: number): Promise<void> {
    this.logger.log(`Processing delivery job for delivery ID: ${deliveryId}`);

    const delivery = await this.deliveriesRepository.findById(deliveryId);

    if (!delivery) {
      this.logger.error(`Delivery ${deliveryId} not found`);
      return;
    }

    if (['SUCCESS', 'DLQ', 'CANCELLED'].includes(delivery.status)) {
      this.logger.log(`Delivery ${deliveryId} is already ${delivery.status}, skipping.`);
      return;
    }

    if (!delivery.endpoint.isActive) {
      await this.deliveriesRepository.markCancelled(deliveryId, 'Endpoint is inactive');
      return;
    }

    const tenant = delivery.event.tenant;
    const rateLimit = tenant.rateLimit ?? 10;
    const tenantLimit = await this.rateLimiter.checkRateLimit(`tenant:${tenant.id}`, rateLimit);
    const endpointLimit =
      !tenantLimit.exceeded && delivery.endpoint.rateLimit
        ? await this.rateLimiter.checkRateLimit(
            `endpoint:${delivery.endpoint.id}`,
            delivery.endpoint.rateLimit,
          )
        : { exceeded: false, delayMs: 0 };
    const exceeded = tenantLimit.exceeded || endpointLimit.exceeded;
    const delayMs = Math.max(tenantLimit.delayMs, endpointLimit.delayMs);

    if (exceeded) {
      const nextAttemptAt = new Date(Date.now() + delayMs);

      this.logger.warn(
        `Rate limit exceeded for tenant ${tenant.name} (${tenant.id}). Delaying delivery ${deliveryId} by ${delayMs}ms.`,
      );

      await this.deliveriesRepository.markRateLimitedAndSchedule(
        deliveryId,
        nextAttemptAt,
        expectedAttempt,
      );
      this.metrics.increment('deliveries_rate_limited_total');
      return;
    }

    await this.executor.execute(delivery, this.deliveryChannel, expectedAttempt);
  }
}
