import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '../../../common/config.service';
import { assertSafeWebhookUrl } from '../../../security/safe-webhook-url';
import {
  ENDPOINTS_REPOSITORY,
  EndpointsRepository,
  EndpointUpdate,
} from '../ports/endpoints.repository';
import { requireOwnedEndpoint } from '../services/endpoint-ownership';

@Injectable()
export class UpdateEndpointUseCase {
  constructor(
    @Inject(ENDPOINTS_REPOSITORY)
    private readonly endpoints: EndpointsRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(tenantId: string, id: string, input: EndpointUpdate) {
    await requireOwnedEndpoint(this.endpoints, tenantId, id);

    if (input.url) {
      input.url = await assertSafeWebhookUrl(input.url, {
        allowLocalUrls: !this.config.isProduction,
      });
    }

    return this.endpoints.update(tenantId, id, input);
  }
}
