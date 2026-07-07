import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DeliveryQueue } from '../../application/ports/delivery-queue.port';
import { OnApplicationBootstrap, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ConfigService } from '../../../common/config.service';

@Injectable()
export class BullmqDeliveryQueue implements DeliveryQueue, OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BullmqDeliveryQueue.name);
  private timer?: NodeJS.Timeout;
  private publishing = false;
  private lastRecoveryAt = 0;

  constructor(
    @InjectQueue('webhook-deliveries')
    private readonly deliveryQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.runPublisher(), this.config.outboxPollInterval);
    this.timer.unref();
    void this.runPublisher();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async publishPending(): Promise<void> {
    if (this.publishing) return;
    this.publishing = true;
    try {
      if (Date.now() - this.lastRecoveryAt >= 60_000) {
        await this.recoverStaleDeliveries();
        await this.recoverStrandedPublishedOutbox();
        this.lastRecoveryAt = Date.now();
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

  private async runPublisher(): Promise<void> {
    try {
      await this.publishPending();
    } catch (error) {
      this.logger.error(
        'Outbox publication failed; it will be retried',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async recoverStaleDeliveries(): Promise<void> {
    await this.prisma.endpoint.updateMany({
      where: { previousSecretExpiresAt: { lt: new Date() } },
      data: { previousSecretKey: null, previousSecretExpiresAt: null },
    });
    await this.prisma.deliveryOutbox.deleteMany({
      where: {
        publishedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    if (this.config.eventRetentionDays > 0) {
      await this.prisma.webhookEvent.deleteMany({
        where: {
          status: { in: ['DONE', 'FAILED'] },
          updatedAt: {
            lt: new Date(Date.now() - this.config.eventRetentionDays * 24 * 60 * 60 * 1000),
          },
        },
      });
    }
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
