import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../../prisma/prisma.service';
import { WEBHOOK_DELIVERY_QUEUE } from '../../../queue/webhook-delivery-queue.constants';
import { DeliveryMaintenanceService } from './delivery-maintenance.service';

@Injectable()
export class DeliveryOutboxPublisherService {
  private publishing = false;
  private lastMaintenanceAt = 0;

  constructor(
    @InjectQueue(WEBHOOK_DELIVERY_QUEUE)
    private readonly deliveryQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly maintenance: DeliveryMaintenanceService,
  ) {}

  async publishPending(): Promise<void> {
    if (this.publishing) return;

    this.publishing = true;
    try {
      if (Date.now() - this.lastMaintenanceAt >= 60_000) {
        await this.maintenance.recoverAndCleanup();
        this.lastMaintenanceAt = Date.now();
      }

      const jobs = await this.prisma.deliveryOutbox.findMany({
        where: { publishedAt: null, availableAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      for (const outbox of jobs) {
        try {
          await this.deliveryQueue.add(
            'deliver-webhook',
            {
              deliveryId: outbox.deliveryId,
              expectedAttempt: outbox.attemptNumber,
            },
            { jobId: this.jobId(outbox.id, outbox.attempts), attempts: 1 },
          );
          await this.prisma.deliveryOutbox.update({
            where: { id: outbox.id },
            data: { publishedAt: new Date(), lastError: null },
          });
        } catch (error) {
          await this.prisma.deliveryOutbox.update({
            where: { id: outbox.id },
            data: {
              attempts: { increment: 1 },
              lastError: (error instanceof Error ? error.message : String(error)).slice(0, 500),
            },
          });
          throw error;
        }
      }
    } finally {
      this.publishing = false;
    }
  }

  private jobId(outboxId: string, publishAttempts: number): string {
    return `outbox-${outboxId}-${publishAttempts}`;
  }
}
