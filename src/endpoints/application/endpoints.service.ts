import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { assertSafeWebhookUrl } from '../infrastructure/safe-webhook-url';

type EndpointInput = {
  url: string;
  eventTypes: string[];
  rateLimit?: number;
};

type EndpointUpdate = Partial<EndpointInput> & { isActive?: boolean };

@Injectable()
export class EndpointsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
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

  async create(tenantId: string, input: EndpointInput) {
    const normalizedUrl = await assertSafeWebhookUrl(input.url);
    const secretKey = this.generateSecret();
    try {
      const endpoint = await this.prisma.endpoint.create({
        data: {
          tenantId,
          url: normalizedUrl,
          secretKey,
          rateLimit: input.rateLimit,
          subscriptions: {
            create: [...new Set(input.eventTypes)].map((eventType) => ({
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
      return { ...endpoint, secretKey };
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('This endpoint URL already exists');
      }
      throw error;
    }
  }

  async update(tenantId: string, id: string, input: EndpointUpdate) {
    await this.requireOwned(tenantId, id);
    if (input.url) {
      input.url = await assertSafeWebhookUrl(input.url);
    }

    return this.prisma.$transaction(async (tx) => {
      if (input.eventTypes) {
        await tx.endpointSubscription.deleteMany({ where: { endpointId: id } });
        await tx.endpointSubscription.createMany({
          data: [...new Set(input.eventTypes)].map((eventType) => ({
            endpointId: id,
            eventType,
          })),
        });
      }
      return tx.endpoint.update({
        where: { id },
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

  async remove(tenantId: string, id: string): Promise<void> {
    await this.requireOwned(tenantId, id);
    await this.prisma.endpoint.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async rotateSecret(tenantId: string, id: string) {
    await this.requireOwned(tenantId, id);
    const secretKey = this.generateSecret();
    const current = await this.prisma.endpoint.findUniqueOrThrow({
      where: { id },
      select: { secretKey: true },
    });
    const previousSecretExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.endpoint.update({
      where: { id },
      data: {
        secretKey,
        previousSecretKey: current.secretKey,
        previousSecretExpiresAt,
      },
    });
    return { endpointId: id, secretKey, previousSecretExpiresAt };
  }

  private async requireOwned(tenantId: string, id: string): Promise<void> {
    const endpoint = await this.prisma.endpoint.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!endpoint) {
      throw new NotFoundException('Endpoint not found');
    }
  }

  private generateSecret(): string {
    return `whsec_${randomBytes(32).toString('hex')}`;
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
