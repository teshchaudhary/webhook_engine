import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { QueryEventsDto } from "./dto/query-events.dto";

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("webhook-deliveries") private readonly deliveryQueue: Queue,
  ) {}

  async ingestEvent(
    tenantId: string,
    idempotencyKey: string,
    dto: CreateEventDto,
  ) {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { endpoints: { where: { isActive: true } } },
      });

      if (!tenant) {
        throw new NotFoundException("Tenant not found");
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const event = await tx.webhookEvent.create({
          data: {
            tenantId,
            idempotencyKey,
            type: dto.type,
            payload: dto.payload,
          },
        });

        const deliveriesData = tenant.endpoints.map((ep) => ({
          id: randomUUID(),
          eventId: event.id,
          endpointId: ep.id,
        }));

        if (deliveriesData.length > 0) {
          await tx.delivery.createMany({ data: deliveriesData });
        }

        return { event, deliveries: deliveriesData };
      });

      if (result.deliveries.length > 0) {
        const jobs = result.deliveries.map((delivery) => ({
          name: "deliver-webhook",
          data: { deliveryId: delivery.id },
        }));

        await this.deliveryQueue.addBulk(jobs);
      }

      this.logger.log(
        `Event ${result.event.id} ingested. Deliveries queued: ${result.deliveries.length}`,
      );

      return {
        message: "Event accepted for processing",
        eventId: result.event.id,
        deliveriesCreated: result.deliveries.length,
      };
    } catch (error: any) {
      if (error.code === "P2002") {
        this.logger.warn(`Idempotency hit for key: ${idempotencyKey}`);
        return {
          message: "Event already accepted",
          idempotencyKey,
        };
      }
      throw error;
    }
  }

  async findAll(query: QueryEventsDto) {
    const {
      tenantId,
      status,
      type,
      from,
      to,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
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
        take: limit,
      }),
      this.prisma.webhookEvent.count({ where }),
    ]);

    return {
      events,
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
    const event = await this.prisma.webhookEvent.findUnique({
      where: { id },
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

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }
}