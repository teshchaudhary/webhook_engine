import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Delivery } from '../../domain/delivery.entity';
import {
  DeliveriesRepository,
  DeliveryListQuery,
  PaginatedDeliveries,
} from '../../application/ports/deliveries.repository';

@Injectable()
export class PrismaDeliveriesRepository implements DeliveriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DeliveryListQuery): Promise<PaginatedDeliveries> {
    const skip = (query.page - 1) * query.limit;
    const where: any = {};

    if (query.tenantId) {
      where.event = { tenantId: query.tenantId };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.eventId) {
      where.eventId = query.eventId;
    }

    if (query.endpointId) {
      where.endpointId = query.endpointId;
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

    const [deliveries, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        include: {
          event: {
            select: {
              id: true,
              type: true,
              createdAt: true,
              tenant: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          endpoint: {
            select: {
              id: true,
              url: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      deliveries,
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

  findById(id: string) {
    return this.prisma.delivery.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        endpoint: {
          select: {
            id: true,
            url: true,
            isActive: true,
          },
        },
      },
    });
  }

  async resetForReplay(id: string): Promise<Delivery> {
    const delivery = await this.prisma.delivery.update({
      where: { id },
      data: {
        status: 'PENDING',
        attempts: 0,
        lastAttemptAt: null,
        nextAttemptAt: new Date(),
        httpStatusCode: null,
        responseSnippet: null,
      },
    });

    return new Delivery(delivery);
  }
}
