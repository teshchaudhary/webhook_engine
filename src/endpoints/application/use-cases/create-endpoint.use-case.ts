import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '../../../common/config.service';
import { assertSafeWebhookUrl } from '../../../security/safe-webhook-url';
import {
  ENDPOINTS_REPOSITORY,
  EndpointInput,
  EndpointsRepository,
} from '../ports/endpoints.repository';
import { generateEndpointSecret } from '../../../security/api-key';

@Injectable()
export class CreateEndpointUseCase {
  constructor(
    @Inject(ENDPOINTS_REPOSITORY)
    private readonly endpoints: EndpointsRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(tenantId: string, input: EndpointInput) {
    const normalizedUrl = await assertSafeWebhookUrl(input.url, {
      allowLocalUrls: !this.config.isProduction,
    });
    const secretKey = generateEndpointSecret();

    try {
      const endpoint = await this.endpoints.create(tenantId, {
        ...input,
        url: normalizedUrl,
        secretKey,
      });
      return { ...endpoint, secretKey };
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code === 'P2002') {
        throw new ConflictException('This endpoint URL already exists');
      }
      throw error;
    }
  }
}
