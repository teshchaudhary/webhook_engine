import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { DeliveryStatus } from '@prisma/client';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('webhook-deliveries') private readonly deliveryQueue: Queue,
  ) {}

  async findAll(query: QueryDeliveriesDto) {
    const {
      tenantId,
      status,
      eventId,
      endpointId,
      from,
      to,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (tenantId) {
      where.event = { tenantId };
    }

    if (status) {
      where.status = status;
    }

    if (eventId) {
      where.eventId = eventId;
    }

    if (endpointId) {
      where.endpointId = endpointId;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
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
        take: limit,
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
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

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    return delivery;
  }

  async replay(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        event: true,
        endpoint: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    if (delivery.status === 'SUCCESS') {
      this.logger.warn(`Delivery ${id} is already successful, skipping replay`);
      return delivery;
    }

    const updatedDelivery = await this.prisma.delivery.update({
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

    await this.deliveryQueue.add('deliver-webhook', { deliveryId: id });

    this.logger.log(`Delivery ${id} reset and enqueued for replay`);

    return updatedDelivery;
  }
}
