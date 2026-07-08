import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../prisma/prisma.service';
import { WebhookEvent } from '../../domain/webhook-event.entity';
import {
  CreateWebhookEventInput,
  CreateWebhookEventResult,
  EventListQuery,
  EventsRepository,
  PaginatedEvents,
} from '../../application/ports/events.repository';

@Injectable()
export class PrismaEventsRepository implements EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createForTenant(input: CreateWebhookEventInput): Promise<CreateWebhookEventResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: input.tenantId },
      include: {
        endpoints: {
          where: {
            isActive: true,
            subscriptions: {
              some: { eventType: { in: [input.type, '*'] } },
            },
          },
        },
      },
    });

    if (!tenant) {
      throw { code: 'TENANT_NOT_FOUND' };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const event = await tx.webhookEvent.create({
        data: {
          tenantId: input.tenantId,
          idempotencyKey: input.idempotencyKey,
          type: input.type,
          payload: input.payload as Prisma.InputJsonValue,
          status: tenant.endpoints.length === 0 ? 'NO_SUBSCRIBERS' : 'PENDING',
        },
      });

      const deliveriesData = tenant.endpoints.map((endpoint) => ({
        id: randomUUID(),
        eventId: event.id,
        endpointId: endpoint.id,
      }));

      if (deliveriesData.length > 0) {
        await tx.delivery.createMany({ data: deliveriesData });
        await tx.deliveryOutbox.createMany({
          data: deliveriesData.map((delivery) => ({
            deliveryId: delivery.id,
          })),
        });
      }

      return {
        event,
        deliveryIds: deliveriesData.map((delivery) => delivery.id),
      };
    });

    return {
      event: new WebhookEvent(result.event),
      deliveryIds: result.deliveryIds,
    };
  }

  async findAll(query: EventListQuery): Promise<PaginatedEvents> {
    const skip = (query.page - 1) * query.limit;
    const where: Prisma.WebhookEventWhereInput = {};

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.createdAt.lte = new Date(query.to);
      }
    }

    const [events, total] = await Promise.all([
      this.prisma.webhookEvent.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
          deliveries: {
            select: {
              id: true,
              status: true,
              endpoint: {
                select: {
                  id: true,
                  url: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.webhookEvent.count({ where }),
    ]);

    return {
      events,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNext: query.page * query.limit < total,
        hasPrev: query.page > 1,
      },
    };
  }

  findById(id: string, tenantId: string) {
    return this.prisma.webhookEvent.findUnique({
      where: { id, tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveries: {
          include: {
            endpoint: {
              select: {
                id: true,
                url: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }
}
