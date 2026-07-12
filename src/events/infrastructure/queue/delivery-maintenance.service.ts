import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ConfigService } from '../../../common/config.service';
import { WEBHOOK_DELIVERY_QUEUE } from '../../../queue/webhook-delivery-queue.constants';

@Injectable()
export class DeliveryMaintenanceService {
  private readonly logger = new Logger(DeliveryMaintenanceService.name);

  constructor(
    @InjectQueue(WEBHOOK_DELIVERY_QUEUE)
    private readonly deliveryQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async recoverAndCleanup(): Promise<void> {
    await this.cleanupExpiredEndpointSecrets();
    await this.cleanupPublishedOutboxRows();
    await this.cleanupOldEvents();
    await this.recoverStaleDeliveries();
    await this.recoverStrandedPublishedOutbox();
  }

  private async cleanupExpiredEndpointSecrets(): Promise<void> {
    await this.prisma.endpoint.updateMany({
      where: { previousSecretExpiresAt: { lt: new Date() } },
      data: { previousSecretKey: null, previousSecretExpiresAt: null },
    });
  }

  private async cleanupPublishedOutboxRows(): Promise<void> {
    await this.prisma.deliveryOutbox.deleteMany({
      where: {
        publishedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
  }

  private async cleanupOldEvents(): Promise<void> {
    if (this.config.eventRetentionDays <= 0) {
      return;
    }

    await this.prisma.webhookEvent.deleteMany({
      where: {
        status: { in: ['DONE', 'FAILED'] },
        updatedAt: {
          lt: new Date(Date.now() - this.config.eventRetentionDays * 24 * 60 * 60 * 1000),
        },
      },
    });
  }

  private async recoverStaleDeliveries(): Promise<void> {
    const cutoff = new Date(Date.now() - this.config.staleDeliveryAge);
    const stale = await this.prisma.delivery.findMany({
      where: { status: 'PROCESSING', lastAttemptAt: { lt: cutoff } },
      select: { id: true, attempts: true },
      take: 100,
    });

    for (const delivery of stale) {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.delivery.updateMany({
          where: {
            id: delivery.id,
            status: 'PROCESSING',
            lastAttemptAt: { lt: cutoff },
          },
          data: { status: 'FAILED', nextAttemptAt: new Date() },
        });

        if (claimed.count) {
          await tx.deliveryOutbox.create({
            data: {
              deliveryId: delivery.id,
              attemptNumber: delivery.attempts + 1,
            },
          });
          this.logger.warn(`Recovered stale delivery ${delivery.id}`);
        }
      });
    }
  }

  private async recoverStrandedPublishedOutbox(): Promise<void> {
    const published = await this.prisma.deliveryOutbox.findMany({
      where: {
        publishedAt: { not: null },
        delivery: {
          status: 'PENDING',
        },
      },
      select: {
        id: true,
        attempts: true,
        deliveryId: true,
      },
      take: 100,
    });

    for (const outbox of published) {
      const currentJob = await this.deliveryQueue.getJob(this.jobId(outbox.id, outbox.attempts));
      const legacyJob = await this.deliveryQueue.getJob(`outbox-${outbox.id}`);
      const job = currentJob ?? legacyJob;
      const state = job ? await job.getState() : 'missing';

      if (state !== 'failed' && state !== 'missing') {
        continue;
      }

      await this.prisma.deliveryOutbox.update({
        where: { id: outbox.id },
        data: {
          publishedAt: null,
          attempts: { increment: 1 },
          lastError: `Recovered stranded ${state} queue job`,
        },
      });
      this.logger.warn(`Recovered stranded outbox ${outbox.id} for delivery ${outbox.deliveryId}`);
    }
  }

  private jobId(outboxId: string, publishAttempts: number): string {
    return `outbox-${outboxId}-${publishAttempts}`;
  }
}
