import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ingestEvent(tenantId: string, idempotencyKey: string, dto: CreateEventDto) {
    try {
      // 1. Fetch tenant and active endpoints
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { endpoints: { where: { isActive: true } } },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
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

        if (tenant.endpoints.length > 0) {
          const deliveries = tenant.endpoints.map((ep) => ({
            eventId: event.id,
            endpointId: ep.id,
          }));

          await tx.delivery.createMany({ data: deliveries });
        }

        return { event, endpointCount: tenant.endpoints.length };
      });

      this.logger.log(`Event ${result.event.id} ingested. Deliveries created: ${result.endpointCount}`);

      return {
        message: 'Event accepted for processing',
        eventId: result.event.id,
        deliveriesCreated: result.endpointCount,
      };
    } catch (error: any) {
      // Handle Unique Constraint (Idempotency)
      if (error.code === 'P2002' && error.meta?.target?.includes('idempotencyKey')) {
        this.logger.warn(`Idempotency hit for key: ${idempotencyKey}`);
        return { message: 'Event already accepted (Idempotent)', idempotencyKey };
      }
      throw error;
    }
  }
}