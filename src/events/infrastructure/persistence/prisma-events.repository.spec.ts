import { PrismaEventsRepository } from './prisma-events.repository';

describe('PrismaEventsRepository', () => {
  it('selects exact and wildcard subscriptions and writes outbox rows', async () => {
    const event = {
      id: 'event-1',
      tenantId: 'tenant-1',
      idempotencyKey: 'key-1',
      type: 'order.created',
      payload: { id: 1 },
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tx = {
      webhookEvent: { create: jest.fn().mockResolvedValue(event) },
      delivery: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      deliveryOutbox: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tenant-1',
          endpoints: [{ id: 'endpoint-1' }, { id: 'endpoint-2' }],
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const repository = new PrismaEventsRepository(prisma as any);

    const result = await repository.createForTenant({
      tenantId: 'tenant-1',
      idempotencyKey: 'key-1',
      type: 'order.created',
      payload: { id: 1 },
    });

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          endpoints: {
            where: {
              isActive: true,
              subscriptions: {
                some: { eventType: { in: ['order.created', '*'] } },
              },
            },
          },
        },
      }),
    );
    expect(result.deliveryIds).toHaveLength(2);
    expect(tx.deliveryOutbox.createMany).toHaveBeenCalledTimes(1);
  });

  it('marks events without matching endpoints as no subscribers', async () => {
    const event = {
      id: 'event-1',
      tenantId: 'tenant-1',
      idempotencyKey: 'key-1',
      type: 'order.created',
      payload: { id: 1 },
      status: 'NO_SUBSCRIBERS',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tx = {
      webhookEvent: { create: jest.fn().mockResolvedValue(event) },
      delivery: { createMany: jest.fn() },
      deliveryOutbox: { createMany: jest.fn() },
    };
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tenant-1',
          endpoints: [],
        }),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const repository = new PrismaEventsRepository(prisma as any);

    const result = await repository.createForTenant({
      tenantId: 'tenant-1',
      idempotencyKey: 'key-1',
      type: 'order.created',
      payload: { id: 1 },
    });

    expect(tx.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        idempotencyKey: 'key-1',
        type: 'order.created',
        payload: { id: 1 },
        status: 'NO_SUBSCRIBERS',
      },
    });
    expect(result.deliveryIds).toEqual([]);
    expect(tx.delivery.createMany).not.toHaveBeenCalled();
    expect(tx.deliveryOutbox.createMany).not.toHaveBeenCalled();
  });
});
