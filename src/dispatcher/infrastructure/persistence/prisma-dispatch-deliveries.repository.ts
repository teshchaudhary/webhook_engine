import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { calculateEventStatus } from '../../application/services/event-status.policy';
import {
  DeliveryFailureInput,
  DispatchDeliveriesRepository,
} from '../../application/ports/dispatch-deliveries.repository';

@Injectable()
export class PrismaDispatchDeliveriesRepository implements DispatchDeliveriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.delivery.findUnique({
      where: { id },
      include: {
        endpoint: true,
        event: {
          include: {
            tenant: true,
          },
        },
      },
    });
  }

  async claimForProcessing(id: string, expectedAttempt: number) {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.delivery.updateMany({
        where: {
          id,
          attempts: expectedAttempt - 1,
          status: { in: ['PENDING', 'FAILED'] },
        },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          nextAttemptAt: null,
        },
      });
      if (claimed.count === 0) return null;
      const delivery = await tx.delivery.findUnique({
        where: { id },
        include: {
          endpoint: true,
          event: { include: { tenant: true } },
        },
      });
      if (delivery) {
        await tx.webhookEvent.update({
          where: { id: delivery.eventId },
          data: { status: 'PROCESSING' },
        });
      }
      return delivery;
    });
  }

  async markSuccess(id: string, statusCode: number, responseSnippet: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.update({
        where: { id },
        data: {
          status: 'SUCCESS',
          httpStatusCode: statusCode,
          responseSnippet,
          nextAttemptAt: null,
        },
      });
      await this.refreshEventStatus(tx, delivery.eventId);
    });
  }

  async markDeadLetter(id: string, statusCode: number, responseSnippet: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.update({
        where: { id },
        data: {
          status: 'DLQ',
          httpStatusCode: statusCode,
          responseSnippet,
          nextAttemptAt: null,
        },
      });
      await this.refreshEventStatus(tx, delivery.eventId);
    });
  }

  async markCancelled(id: string, reason: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          responseSnippet: reason,
          nextAttemptAt: null,
        },
      });
      await this.refreshEventStatus(tx, delivery.eventId);
    });
  }

  async markFailedAndSchedule(input: DeliveryFailureInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: input.id },
        data: {
          status: 'FAILED',
          httpStatusCode: input.statusCode,
          responseSnippet: input.responseSnippet,
          nextAttemptAt: input.nextAttemptAt,
        },
      });
      await tx.deliveryOutbox.create({
        data: {
          deliveryId: input.id,
          availableAt: input.nextAttemptAt,
          attemptNumber: input.nextAttemptNumber,
        },
      });
    });
  }

  async markRateLimitedAndSchedule(
    id: string,
    nextAttemptAt: Date,
    attemptNumber: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id },
        data: { status: 'PENDING', nextAttemptAt },
      });
      await tx.deliveryOutbox.create({
        data: { deliveryId: id, availableAt: nextAttemptAt, attemptNumber },
      });
    });
  }

  private async refreshEventStatus(tx: Prisma.TransactionClient, eventId: string): Promise<void> {
    const deliveries = await tx.delivery.findMany({
      where: { eventId },
      select: { status: true },
    });
    await tx.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: calculateEventStatus(deliveries.map((delivery) => delivery.status)),
      },
    });
  }
}
