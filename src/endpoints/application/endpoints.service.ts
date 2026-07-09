import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConfigService } from '../../common/config.service';
import {
  ENDPOINTS_REPOSITORY,
  EndpointInput,
  EndpointsRepository,
  EndpointUpdate,
} from './ports/endpoints.repository';
import { assertSafeWebhookUrl } from '../infrastructure/safe-webhook-url';

@Injectable()
export class EndpointsService {
  constructor(
    @Inject(ENDPOINTS_REPOSITORY)
    private readonly endpoints: EndpointsRepository,
    private readonly config: ConfigService,
  ) {}

  list(tenantId: string) {
    return this.endpoints.list(tenantId);
  }

  async create(tenantId: string, input: EndpointInput) {
    const normalizedUrl = await assertSafeWebhookUrl(input.url, {
      allowLocalUrls: !this.config.isProduction,
    });
    const secretKey = this.generateSecret();
    try {
      const endpoint = await this.endpoints.create(tenantId, {
        ...input,
        url: normalizedUrl,
        secretKey,
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
      input.url = await assertSafeWebhookUrl(input.url, {
        allowLocalUrls: !this.config.isProduction,
      });
    }

    return this.endpoints.update(tenantId, id, input);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.requireOwned(tenantId, id);
    await this.endpoints.softDelete(id);
  }

  async rotateSecret(tenantId: string, id: string) {
    await this.requireOwned(tenantId, id);
    const secretKey = this.generateSecret();
    const previousSecretExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.endpoints.rotateSecret(id, secretKey, previousSecretExpiresAt);
    return { endpointId: id, secretKey, previousSecretExpiresAt };
  }

  private async requireOwned(tenantId: string, id: string): Promise<void> {
    const endpoint = await this.endpoints.findOwned(tenantId, id);
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
