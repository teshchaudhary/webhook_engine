import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../../common/config.service';
import {
  WEBHOOK_SIGNER,
  WebhookSigner,
} from '../../../security/application/ports/webhook-signer.port';
import { DeliveryChannel } from '../ports/delivery-channel.port';
import {
  DISPATCH_DELIVERIES_REPOSITORY,
  DispatchableDelivery,
  DispatchDeliveriesRepository,
} from '../ports/dispatch-deliveries.repository';
import { Inject } from '@nestjs/common';
import { MetricsService } from '../../../common/metrics.service';

@Injectable()
export class DeliveryExecutorService {
  private readonly logger = new Logger(DeliveryExecutorService.name);

  constructor(
    @Inject(DISPATCH_DELIVERIES_REPOSITORY)
    private readonly deliveriesRepository: DispatchDeliveriesRepository,
    private readonly config: ConfigService,
    @Inject(WEBHOOK_SIGNER)
    private readonly webhookSigning: WebhookSigner,
    private readonly metrics: MetricsService,
  ) {}

  async execute(
    delivery: DispatchableDelivery,
    channel: DeliveryChannel,
    expectedAttempt: number,
  ): Promise<void> {
    const claimed = await this.deliveriesRepository.claimForProcessing(
      delivery.id,
      expectedAttempt,
    );
    if (!claimed) {
      this.logger.warn(`Delivery ${delivery.id} was already claimed; skipping`);
      return;
    }
    delivery = claimed;
    const deliveryId = delivery.id;
    const attempts = delivery.attempts;

    try {
      const envelope = {
        id: delivery.event.id,
        type: delivery.event.type,
        version: '1',
        createdAt: delivery.event.createdAt.toISOString(),
        data: delivery.event.payload,
      };
      const securityHeaders = this.webhookSigning.generateWebhookHeaders(
        delivery.endpoint.secretKey,
        envelope,
      );
      if (
        delivery.endpoint.previousSecretKey &&
        delivery.endpoint.previousSecretExpiresAt &&
        delivery.endpoint.previousSecretExpiresAt > new Date()
      ) {
        const previous = this.webhookSigning.generateSignature(
          delivery.endpoint.previousSecretKey,
          securityHeaders['x-webhook-timestamp'],
          envelope,
        );
        securityHeaders['x-webhook-signature-previous'] = `v1=${previous}`;
      }

      const response = await channel.send(delivery.endpoint.url, envelope, securityHeaders);

      await this.deliveriesRepository.markSuccess(
        deliveryId,
        response.status,
        this.config.captureResponseBodies
          ? this.redact(response.data).substring(0, 255) || 'OK'
          : `HTTP ${response.status}`,
      );
      this.metrics.increment('deliveries_success_total');

      this.logger.log(`Delivery ${deliveryId} completed successfully (Status: ${response.status})`);
    } catch (error: unknown) {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: unknown;
          headers?: Record<string, string | undefined>;
        };
        status?: number;
        message?: string;
      };
      const status = axiosError.response?.status || axiosError.status || 500;
      const responseText = axiosError.response?.data
        ? typeof axiosError.response.data === 'string'
          ? axiosError.response.data
          : JSON.stringify(axiosError.response.data)
        : axiosError.message || 'Unknown error';
      const snippet = this.config.captureResponseBodies
        ? this.redact(responseText).substring(0, 255)
        : `HTTP ${status}`;

      const retryConfig = this.config.retryConfig;
      if (attempts >= retryConfig.maxAttempts || !this.isRetryable(status)) {
        await this.deliveriesRepository.markDeadLetter(deliveryId, status, snippet);
        this.metrics.increment('deliveries_dlq_total');

        this.logger.error(`Delivery ${deliveryId} moved to DLQ after ${attempts} attempts`);
        return;
      } else {
        const nextAttemptDelay =
          status === 429
            ? (this.retryAfterDelay(
                axiosError.response?.headers?.['retry-after'],
                retryConfig.maxDelay,
              ) ?? this.calculateBackoffDelay(attempts, retryConfig))
            : this.calculateBackoffDelay(attempts, retryConfig);
        const nextAttemptAt = new Date(Date.now() + nextAttemptDelay);

        await this.deliveriesRepository.markFailedAndSchedule({
          id: deliveryId,
          statusCode: status,
          responseSnippet: snippet,
          nextAttemptAt,
          nextAttemptNumber: attempts + 1,
        });
        this.metrics.increment('delivery_retries_scheduled_total');

        this.logger.warn(
          `Delivery ${deliveryId} failed (attempt ${attempts}/${retryConfig.maxAttempts}). Next retry at ${nextAttemptAt.toISOString()}`,
        );
        return;
      }
    }
  }

  private isRetryable(status: number): boolean {
    return status >= 500 || [408, 409, 425, 429].includes(status);
  }

  private redact(value: string): string {
    return value.replace(
      /("?(?:password|secret|token|api[_-]?key|authorization)"?\s*[:=]\s*)[^,}\s]+/gi,
      '$1[REDACTED]',
    );
  }

  private calculateBackoffDelay(
    attemptNumber: number,
    config: { baseDelay: number; maxDelay: number; backoffMultiplier: number },
  ): number {
    const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1);
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.min(Math.max(delay + jitter, 0), config.maxDelay);
  }

  private retryAfterDelay(value: string | undefined, maximum: number): number | null {
    if (!value) return null;
    const seconds = Number(value);
    const delay = Number.isFinite(seconds)
      ? seconds * 1000
      : new Date(value).getTime() - Date.now();
    return Number.isFinite(delay) ? Math.min(Math.max(delay, 0), maximum) : null;
  }
}
