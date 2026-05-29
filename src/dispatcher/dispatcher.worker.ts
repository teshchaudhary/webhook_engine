import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { DeliveryExecutorService } from './services/delivery-executor.service';
import { HttpDeliveryChannel } from './services/http-delivery-channel.service';

@Processor('webhook-deliveries')
export class DispatcherWorker extends WorkerHost {
  private readonly logger = new Logger(DispatcherWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimiter: RateLimiterService,
    private readonly executor: DeliveryExecutorService,
    private readonly httpChannel: HttpDeliveryChannel,
    @InjectQueue('webhook-deliveries') private readonly deliveryQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<{ deliveryId: string }>): Promise<void> {
    const { deliveryId } = job.data;
    
    this.logger.log(`Processing delivery job for delivery ID: ${deliveryId}`);

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        endpoint: true,
        event: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!delivery) {
      this.logger.error(`Delivery ${deliveryId} not found`);
      return;
    }

    if (delivery.status === 'SUCCESS' || delivery.status === 'DLQ') {
      this.logger.log(`Delivery ${deliveryId} is already ${delivery.status}, skipping.`);
      return;
    }

    // Rate Limiting Check (per-tenant rate limit)
    const tenant = delivery.event.tenant;
    const rateLimit = (tenant as any).rateLimit ?? 10;

    const { exceeded, delayMs } = await this.rateLimiter.checkRateLimit(
      tenant.id,
      rateLimit,
    );

    if (exceeded) {
      const nextAttemptAt = new Date(Date.now() + delayMs);

      this.logger.warn(
        `Rate limit exceeded for tenant ${tenant.name} (${tenant.id}). Delaying delivery ${deliveryId} by ${delayMs}ms.`
      );

      await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'PENDING',
          nextAttemptAt,
        },
      });

      await this.deliveryQueue.add('deliver-webhook', { deliveryId }, { delay: delayMs });
      return;
    }

    // Delegate delivery execution to the dedicated execution service using HTTP delivery channel
    await this.executor.execute(delivery, this.httpChannel);
  }
}