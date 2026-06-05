import { Injectable } from '@nestjs/common';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface SecurityConfig {
  maxTimestampAge: number;
  signatureAlgorithm: string;
}

export interface WebhookConfig {
  retry: RetryConfig;
  timeout: number;
  outboxPollInterval: number;
  staleDeliveryAge: number;
  security: SecurityConfig;
}

@Injectable()
export class ConfigService {
  private readonly config: WebhookConfig;

  constructor() {
    this.config = {
      retry: {
        maxAttempts: this.positiveInteger('WEBHOOK_MAX_ATTEMPTS', 5),
        baseDelay: this.positiveInteger('WEBHOOK_BASE_DELAY', 1000),
        maxDelay: this.positiveInteger('WEBHOOK_MAX_DELAY', 300000),
        backoffMultiplier: this.positiveNumber('WEBHOOK_BACKOFF_MULTIPLIER', 2),
      },
      timeout: this.positiveInteger('WEBHOOK_TIMEOUT', 10000),
      outboxPollInterval: this.positiveInteger('OUTBOX_POLL_INTERVAL', 1000),
      staleDeliveryAge: this.positiveInteger('STALE_DELIVERY_AGE', 15 * 60 * 1000),
      security: {
        maxTimestampAge: this.positiveInteger('WEBHOOK_MAX_TIMESTAMP_AGE', 300),
        signatureAlgorithm: process.env.WEBHOOK_SIGNATURE_ALGORITHM || 'sha256',
      },
    };

    if (this.config.retry.maxDelay < this.config.retry.baseDelay) {
      throw new Error('WEBHOOK_MAX_DELAY must be greater than WEBHOOK_BASE_DELAY');
    }
    if (!['sha256', 'sha384', 'sha512'].includes(this.config.security.signatureAlgorithm)) {
      throw new Error('WEBHOOK_SIGNATURE_ALGORITHM must be sha256, sha384, or sha512');
    }
  }

  get webhookConfig(): WebhookConfig {
    return this.config;
  }

  get retryConfig(): RetryConfig {
    return this.config.retry;
  }

  get timeout(): number {
    return this.config.timeout;
  }

  get securityConfig(): SecurityConfig {
    return this.config.security;
  }

  get outboxPollInterval(): number {
    return this.config.outboxPollInterval;
  }

  get staleDeliveryAge(): number {
    return this.config.staleDeliveryAge;
  }

  get adminApiKey(): string {
    const value = process.env.ADMIN_API_KEY;
    if (value) {
      return value;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error('ADMIN_API_KEY is required in production');
    }

    return 'dev-admin-key-change-me';
  }

  get captureResponseBodies(): boolean {
    return process.env.CAPTURE_WEBHOOK_RESPONSE_BODIES === 'true';
  }

  get eventRetentionDays(): number {
    const value = Number(process.env.EVENT_RETENTION_DAYS ?? 0);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('EVENT_RETENTION_DAYS must be a non-negative integer');
    }
    return value;
  }

  private positiveInteger(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${name} must be a positive integer`);
    }
    return value;
  }

  private positiveNumber(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${name} must be a positive number`);
    }
    return value;
  }
}
