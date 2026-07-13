import { Inject, Injectable } from '@nestjs/common';
import {
  ENDPOINTS_REPOSITORY,
  EndpointsRepository,
} from '../ports/endpoints.repository';
import { generateEndpointSecret } from '../../../security/api-key';
import { requireOwnedEndpoint } from '../services/endpoint-ownership';

@Injectable()
export class RotateEndpointSecretUseCase {
  constructor(
    @Inject(ENDPOINTS_REPOSITORY)
    private readonly endpoints: EndpointsRepository,
  ) {}

  async execute(tenantId: string, id: string) {
    await requireOwnedEndpoint(this.endpoints, tenantId, id);

    const secretKey = generateEndpointSecret();
    const previousSecretExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.endpoints.rotateSecret(id, secretKey, previousSecretExpiresAt);

    return { endpointId: id, secretKey, previousSecretExpiresAt };
  }
}
