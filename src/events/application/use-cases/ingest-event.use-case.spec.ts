import { MetricsService } from '../../../common/metrics.service';
import { IngestEventUseCase } from './ingest-event.use-case';

describe('IngestEventUseCase', () => {
  it('persists the event and asks the outbox publisher to flush', async () => {
    const repository = {
      createForTenant: jest.fn().mockResolvedValue({
        event: { id: 'event-1' },
        deliveryIds: ['delivery-1', 'delivery-2'],
      }),
    };
    const queue = { publishPending: jest.fn().mockResolvedValue(undefined) };
    const useCase = new IngestEventUseCase(repository as any, queue, new MetricsService());

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        idempotencyKey: 'key-1',
        type: 'order.created',
        payload: { id: 1 },
      }),
    ).resolves.toEqual({
      message: 'Event accepted for processing',
      eventId: 'event-1',
      deliveriesCreated: 2,
    });
    expect(queue.publishPending).toHaveBeenCalledTimes(1);
  });
});
