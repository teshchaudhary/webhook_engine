import { ConfigService } from '../common/config.service';
import { WebhookSigningService } from './webhook-signing.service';

describe('WebhookSigningService', () => {
  const service = new WebhookSigningService(new ConfigService());
  const secret = 'whsec_test';
  const payload = { orderId: 'order-1' };

  it('creates a versioned signature that verifies', () => {
    const headers = service.generateWebhookHeaders(secret, payload);
    expect(headers['x-webhook-signature']).toMatch(/^v1=/);
    expect(
      service.verifyWebhookSignature(
        secret,
        headers['x-webhook-timestamp'],
        headers['x-webhook-signature'],
        payload,
      ),
    ).toBe(true);
  });

  it('rejects changed payloads and expired timestamps', () => {
    const timestamp = String(Date.now() - 10_000);
    const signature = `v1=${service.generateSignature(secret, timestamp, payload)}`;
    expect(
      service.verifyWebhookSignature(secret, timestamp, signature, {
        other: true,
      }),
    ).toBe(false);
    expect(service.verifyWebhookSignature(secret, timestamp, signature, payload, 1)).toBe(false);
  });
});
