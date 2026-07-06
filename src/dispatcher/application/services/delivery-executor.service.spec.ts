import { ConfigService } from '../../../common/config.service';
import { MetricsService } from '../../../common/metrics.service';
import { DeliveryExecutorService } from './delivery-executor.service';

describe('DeliveryExecutorService', () => {
  it('atomically claims and sends a versioned event envelope', async () => {
    const delivery = {
      id: 'delivery-1',
      attempts: 1,
      status: 'PENDING',
      endpoint: {
        id: 'endpoint-1',
        url: 'https://example.com/webhooks',
        secretKey: 'secret',
        previousSecretKey: null,
        previousSecretExpiresAt: null,
        rateLimit: null,
        isActive: true,
      },
      event: {
        id: 'event-1',
        type: 'order.created',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        payload: { orderId: 'order-1' },
        tenant: { id: 'tenant-1', name: 'Acme', rateLimit: 10 },
      },
    };
    const repository = {
      claimForProcessing: jest.fn().mockResolvedValue(delivery),
      markSuccess: jest.fn().mockResolvedValue(undefined),
    };
    const signer = {
      generateWebhookHeaders: jest.fn().mockReturnValue({
        'x-webhook-timestamp': '1',
        'x-webhook-signature': 'v1=signature',
      }),
    };
    const channel = {
      send: jest.fn().mockResolvedValue({ status: 200, data: 'ok' }),
    };
    const service = new DeliveryExecutorService(
      repository as any,
      new ConfigService(),
      signer as any,
      new MetricsService(),
    );

    await service.execute(delivery, channel, 1);

    expect(channel.send).toHaveBeenCalledWith(
      delivery.endpoint.url,
      {
        id: 'event-1',
        type: 'order.created',
        version: '1',
        createdAt: '2026-01-01T00:00:00.000Z',
        data: { orderId: 'order-1' },
      },
      expect.objectContaining({ 'x-webhook-signature': 'v1=signature' }),
    );
    expect(repository.markSuccess).toHaveBeenCalledWith('delivery-1', 200, 'HTTP 200');
  });
});
