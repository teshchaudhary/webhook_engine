import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { generateApiKey, hashApiKey } from '../../../security/api-key';
import { assertSafeWebhookUrl } from '../../../endpoints/infrastructure/safe-webhook-url';
import { TENANTS_REPOSITORY, TenantsRepository } from '../ports/tenants.repository';

export type CreateTenantCommand = {
  name: string;
  rateLimit?: number;
  endpoints?: Array<{ url: string; eventTypes: string[]; rateLimit?: number }>;
};

@Injectable()
export class CreateTenantUseCase {
  constructor(
    @Inject(TENANTS_REPOSITORY)
    private readonly tenantsRepository: TenantsRepository,
  ) {}

  async execute(command: CreateTenantCommand) {
    const normalizedUrls = await Promise.all(
      (command.endpoints ?? []).map((endpoint) => assertSafeWebhookUrl(endpoint.url)),
    );
    if (new Set(normalizedUrls).size !== normalizedUrls.length) {
      throw new BadRequestException('A tenant cannot contain duplicate endpoint URLs');
    }
    const apiKey = generateApiKey();
    const endpoints = command.endpoints?.map((endpoint, index) => ({
      ...endpoint,
      url: normalizedUrls[index],
      secretKey: `whsec_${randomBytes(32).toString('hex')}`,
    }));
    const tenant = await this.tenantsRepository.create({
      ...command,
      apiKeyHash: hashApiKey(apiKey),
      endpoints,
    });

    return {
      tenant: tenant.toJSON(),
      apiKey,
      endpoints:
        endpoints?.map(({ url, eventTypes, secretKey }) => ({
          url,
          eventTypes,
          secretKey,
        })) ?? [],
      message: 'Store this API key securely; it will not be shown again.',
    };
  }
}
