import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";

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
      // 1. Fetch tenant and active endpoints
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { endpoints: { where: { isActive: true } } },
      });

      if (!tenant) {
        throw new NotFoundException("Tenant not found");
      }

      // 2. Perform DB Transaction (Event + Delivery Fan-out)
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
          id: randomUUID(), // Generate UUID here so we know the IDs for the queue
          eventId: event.id,
          endpointId: ep.id,
        }));

        if (deliveriesData.length > 0) {
          await tx.delivery.createMany({ data: deliveriesData });
        }

        return { event, deliveries: deliveriesData };
      });

      // 3. Enqueue Jobs to BullMQ
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
      // Handle Unique Constraint (Idempotency)
      if (
        error.code === "P2002" &&
        error.meta?.target?.includes("idempotencyKey")
      ) {
        this.logger.warn(`Idempotency hit for key: ${idempotencyKey}`);
        return {
          message: "Event already accepted (Idempotent)",
          idempotencyKey,
        };
      }
      throw error;
    }
  }
}
