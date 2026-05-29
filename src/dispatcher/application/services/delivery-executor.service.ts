import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../../common/config.service';
import { WebhookSigningService } from '../../../security/webhook-signing.service';
import { DeliveryChannel } from '../ports/delivery-channel.port';
import {
  DISPATCH_DELIVERIES_REPOSITORY,
  DispatchDeliveriesRepository,
} from '../ports/dispatch-deliveries.repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class DeliveryExecutorService {
  private readonly logger = new Logger(DeliveryExecutorService.name);

  constructor(
    @Inject(DISPATCH_DELIVERIES_REPOSITORY)
    private readonly deliveriesRepository: DispatchDeliveriesRepository,
    private readonly config: ConfigService,
    private readonly webhookSigning: WebhookSigningService,
  ) {}

  async execute(delivery: any, channel: DeliveryChannel): Promise<void> {
    const deliveryId = delivery.id;
    const attempts = delivery.attempts + 1;

    await this.deliveriesRepository.markProcessing(deliveryId, attempts);

    try {
      const securityHeaders = this.webhookSigning.generateWebhookHeaders(
        delivery.event.tenant.secretKey,
        delivery.event.payload,
      );

      const response = await channel.send(
        delivery.endpoint.url,
        delivery.event.payload as Record<string, unknown>,
        securityHeaders as any,
      );

      await this.deliveriesRepository.markSuccess(
        deliveryId,
        response.status,
        response.data.substring(0, 255) || 'OK',
      );

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
        await this.deliveriesRepository.markDeadLetter(
          deliveryId,
          status,
          snippet,
        );

        this.logger.error(`Delivery ${deliveryId} moved to DLQ after ${attempts} attempts`);
        return;
      } else {
        const nextAttemptDelay = this.calculateBackoffDelay(attempts, retryConfig);
        const nextAttemptAt = new Date(Date.now() + nextAttemptDelay);

        await this.deliveriesRepository.markFailed({
          id: deliveryId,
          statusCode: status,
          responseSnippet: snippet,
          nextAttemptAt,
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
