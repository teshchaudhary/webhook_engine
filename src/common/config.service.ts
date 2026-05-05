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
  security: SecurityConfig;
}

@Injectable()
export class ConfigService {
  private readonly config: WebhookConfig;

  constructor() {
    this.config = {
      retry: {
        maxAttempts: parseInt(process.env.WEBHOOK_MAX_ATTEMPTS || '5', 10),
        baseDelay: parseInt(process.env.WEBHOOK_BASE_DELAY || '1000', 10),
        maxDelay: parseInt(process.env.WEBHOOK_MAX_DELAY || '300000', 10),
        backoffMultiplier: parseFloat(process.env.WEBHOOK_BACKOFF_MULTIPLIER || '2'),
      },
      timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '10000', 10),
      security: {
        maxTimestampAge: parseInt(process.env.WEBHOOK_MAX_TIMESTAMP_AGE || '300', 10),
        signatureAlgorithm: process.env.WEBHOOK_SIGNATURE_ALGORITHM || 'sha256',
      },
    };
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
}
