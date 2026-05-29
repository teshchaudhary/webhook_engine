import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  DeliveryFailureInput,
  DispatchDeliveriesRepository,
} from '../../application/ports/dispatch-deliveries.repository';

@Injectable()
export class PrismaDispatchDeliveriesRepository
  implements DispatchDeliveriesRepository
{
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

  async markProcessing(id: string, attempts: number): Promise<void> {
    await this.prisma.delivery.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        attempts,
        lastAttemptAt: new Date(),
      },
    });
  }

  async markSuccess(
    id: string,
    statusCode: number,
    responseSnippet: string,
  ): Promise<void> {
    await this.prisma.delivery.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        httpStatusCode: statusCode,
        responseSnippet,
      },
    });
  }

  async markDeadLetter(
    id: string,
    statusCode: number,
    responseSnippet: string,
  ): Promise<void> {
    await this.prisma.delivery.update({
      where: { id },
      data: {
        status: 'DLQ',
        httpStatusCode: statusCode,
        responseSnippet,
      },
    });
  }

  async markFailed(input: DeliveryFailureInput): Promise<void> {
    await this.prisma.delivery.update({
      where: { id: input.id },
      data: {
        status: 'FAILED',
        httpStatusCode: input.statusCode,
        responseSnippet: input.responseSnippet,
        nextAttemptAt: input.nextAttemptAt,
      },
    });
  }

  async markRateLimited(id: string, nextAttemptAt: Date): Promise<void> {
    await this.prisma.delivery.update({
      where: { id },
      data: {
        status: 'PENDING',
        nextAttemptAt,
      },
    });
  }
}
