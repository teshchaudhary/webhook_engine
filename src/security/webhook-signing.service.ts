import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '../common/config.service';
import {
  WebhookHeaders,
  WebhookSignature,
  WebhookSigner,
} from './application/ports/webhook-signer.port';

@Injectable()
export class WebhookSigningService implements WebhookSigner {
  generateSignature(secretKey: string, timestamp: string, payload: unknown): string {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const payloadToSign = `${timestamp}.${payloadString}`;

    return crypto
      .createHmac(this.config.securityConfig.signatureAlgorithm, secretKey)
      .update(payloadToSign, 'utf8')
      .digest('hex');
  }

  generateWebhookSignature(secretKey: string, payload: unknown): WebhookSignature {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(secretKey, timestamp, payload);

    return {
      timestamp,
      signature: `v1=${signature}`,
    };
  }

  generateWebhookHeaders(secretKey: string, payload: unknown): WebhookHeaders {
    const { timestamp, signature } = this.generateWebhookSignature(secretKey, payload);

    return {
      'x-webhook-timestamp': timestamp,
      'x-webhook-signature': signature,
    };
  }

  verifyWebhookSignature(
    secretKey: string,
    timestamp: string,
    signature: string,
    payload: unknown,
    maxAgeSeconds: number = 300,
  ): boolean {
    const now = Date.now();
    const timestampNum = parseInt(timestamp, 10);

    if (isNaN(timestampNum) || Math.abs(now - timestampNum) > maxAgeSeconds * 1000) {
      return false;
    }

    const suppliedSignature = signature.startsWith('v1=') ? signature.slice(3) : signature;
    const expectedSignature = this.generateSignature(secretKey, timestamp, payload);

    return this.constantTimeEqual(suppliedSignature, expectedSignature);
  }

  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  constructor(private readonly config: ConfigService) {}
}
