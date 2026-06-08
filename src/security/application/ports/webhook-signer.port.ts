export const WEBHOOK_SIGNER = Symbol('WEBHOOK_SIGNER');

export interface WebhookSignature {
  timestamp: string;
  signature: string;
}

export interface WebhookHeaders {
  [key: string]: string | undefined;
  'x-webhook-timestamp': string;
  'x-webhook-signature': string;
  'x-webhook-signature-previous'?: string;
}

export interface WebhookSigner {
  generateSignature(secretKey: string, timestamp: string, payload: unknown): string;
  generateWebhookSignature(secretKey: string, payload: unknown): WebhookSignature;
  generateWebhookHeaders(secretKey: string, payload: unknown): WebhookHeaders;
  verifyWebhookSignature(
    secretKey: string,
    timestamp: string,
    signature: string,
    payload: unknown,
    maxAgeSeconds?: number,
  ): boolean;
}
