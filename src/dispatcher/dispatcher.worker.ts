import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import axios from 'axios';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../common/config.service';
import { WebhookSigningService } from '../security/webhook-signing.service';

@Processor('webhook-deliveries')
export class DispatcherWorker extends WorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(DispatcherWorker.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly webhookSigning: WebhookSigningService,
    @InjectQueue('webhook-deliveries') private readonly deliveryQueue: Queue,
  ) {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      maxRetriesPerRequest: null,
    });
  }

  async onModuleDestroy() {
    this.redis.disconnect();
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
    const tenantId = tenant.id;
    const rateLimit = (tenant as any).rateLimit ?? 10;
    const currentSecond = Math.floor(Date.now() / 1000);
    const rateLimitKey = `rate-limit:${tenantId}:${currentSecond}`;

    const currentRequests = await this.redis.incr(rateLimitKey);
    if (currentRequests === 1) {
      await this.redis.expire(rateLimitKey, 2);
    }

    if (currentRequests > rateLimit) {
      const delay = Math.max(1000 - (Date.now() % 1000), 100);
      const nextAttemptAt = new Date(Date.now() + delay);

      this.logger.warn(
        `Rate limit exceeded for tenant ${tenant.name} (${tenantId}). Current: ${currentRequests}, Limit: ${rateLimit}. Delaying delivery ${deliveryId} by ${delay}ms.`
      );

      await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'PENDING',
          nextAttemptAt,
        },
      });

      await this.deliveryQueue.add('deliver-webhook', { deliveryId }, { delay });
      return;
    }

    const attempts = delivery.attempts + 1;
    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { 
        status: 'PROCESSING' as any,
        attempts, 
        lastAttemptAt: new Date() 
      },
    });

    try {
      const securityHeaders = this.webhookSigning.generateWebhookHeaders(
        delivery.event.tenant.secretKey,
        delivery.event.payload,
      );

      const response = await axios.post(
        delivery.endpoint.url,
        delivery.event.payload as Record<string, unknown>,
        {
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders,
          },
          timeout: 10000,
        },
      );

      await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SUCCESS',
          httpStatusCode: response.status,
          responseSnippet: typeof response.data === 'string'
            ? response.data.substring(0, 255)
            : JSON.stringify(response.data)?.substring(0, 255) || 'OK',
        },
      });

      this.logger.log(`Delivery ${deliveryId} completed successfully (Status: ${response.status})`);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: unknown }; status?: number; message?: string };
      const status = axiosError.response?.status || axiosError.status || 500;
      const snippet = axiosError.response?.data
        ? (typeof axiosError.response.data === 'string'
            ? axiosError.response.data.substring(0, 255)
            : JSON.stringify(axiosError.response.data).substring(0, 255))
        : (axiosError.message || 'Unknown error').substring(0, 255);

      const retryConfig = this.config.retryConfig;
      if (attempts >= retryConfig.maxAttempts) {
        await this.prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            status: 'DLQ',
            httpStatusCode: status,
            responseSnippet: snippet,
          },
        });

        this.logger.error(`Delivery ${deliveryId} moved to DLQ after ${attempts} attempts`);
        
        return;
      } else {
        const nextAttemptDelay = this.calculateBackoffDelay(attempts, retryConfig);
        const nextAttemptAt = new Date(Date.now() + nextAttemptDelay);

        await this.prisma.delivery.update({
          where: { id: deliveryId },
          data: {
            status: 'FAILED',
            httpStatusCode: status,
            responseSnippet: snippet,
            nextAttemptAt,
          },
        });

        this.logger.warn(`Delivery ${deliveryId} failed (attempt ${attempts}/${retryConfig.maxAttempts}). Next retry at ${nextAttemptAt.toISOString()}`);
        
        throw error;
      }
    }
  }

  private calculateBackoffDelay(attemptNumber: number, config: { baseDelay: number; maxDelay: number; backoffMultiplier: number }): number {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1);
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.min(Math.max(delay + jitter, 0), config.maxDelay);
  }
}