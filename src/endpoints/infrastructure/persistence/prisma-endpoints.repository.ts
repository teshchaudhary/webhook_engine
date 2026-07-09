import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  EndpointInput,
  EndpointsRepository,
  EndpointSummary,
  EndpointUpdate,
} from '../../application/ports/endpoints.repository';

@Injectable()
export class PrismaEndpointsRepository implements EndpointsRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string): Promise<EndpointSummary[]> {
    return this.prisma.endpoint.findMany({
      where: { tenantId },
      select: {
        id: true,
        url: true,
        isActive: true,
        rateLimit: true,
        createdAt: true,
        updatedAt: true,
        subscriptions: { select: { eventType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(tenantId: string, input: EndpointInput & { secretKey: string }): Promise<EndpointSummary> {
    return this.prisma.endpoint.create({
      data: {
        tenantId,
        url: input.url,
        secretKey: input.secretKey,
        rateLimit: input.rateLimit,
        subscriptions: {
          create: this.uniqueEventTypes(input.eventTypes).map((eventType) => ({
            eventType,
          })),
        },
      },
      select: {
        id: true,
        url: true,
        isActive: true,
        rateLimit: true,
        subscriptions: { select: { eventType: true } },
      },
    });
  }

  update(tenantId: string, id: string, input: EndpointUpdate): Promise<EndpointSummary> {
    return this.prisma.$transaction(async (tx) => {
      if (input.eventTypes) {
        await tx.endpointSubscription.deleteMany({ where: { endpointId: id } });
        await tx.endpointSubscription.createMany({
          data: this.uniqueEventTypes(input.eventTypes).map((eventType) => ({
            endpointId: id,
            eventType,
          })),
        });
      }

      return tx.endpoint.update({
        where: { id, tenantId },
        data: {
          url: input.url,
          isActive: input.isActive,
          rateLimit: input.rateLimit,
        },
        select: {
          id: true,
          url: true,
          isActive: true,
          rateLimit: true,
          subscriptions: { select: { eventType: true } },
        },
      });
    });
  }

  findOwned(tenantId: string, id: string): Promise<{ id: string } | null> {
    return this.prisma.endpoint.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.endpoint.update({
      where: { id },
      data: { isActive: false },
    });
  }

  findSecret(id: string): Promise<{ secretKey: string }> {
    return this.prisma.endpoint.findUniqueOrThrow({
      where: { id },
      select: { secretKey: true },
    });
  }

  async rotateSecret(
    id: string,
    secretKey: string,
    previousSecretExpiresAt: Date,
  ): Promise<void> {
    const current = await this.findSecret(id);

    await this.prisma.endpoint.update({
      where: { id },
      data: {
        secretKey,
        previousSecretKey: current.secretKey,
        previousSecretExpiresAt,
      },
    });
  }

  private uniqueEventTypes(eventTypes: string[]): string[] {
    return [...new Set(eventTypes)];
  }
}
