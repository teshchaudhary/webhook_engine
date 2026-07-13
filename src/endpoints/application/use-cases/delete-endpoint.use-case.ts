import { Inject, Injectable } from '@nestjs/common';
import {
  ENDPOINTS_REPOSITORY,
  EndpointsRepository,
} from '../ports/endpoints.repository';
import { requireOwnedEndpoint } from '../services/endpoint-ownership';

@Injectable()
export class DeleteEndpointUseCase {
  constructor(
    @Inject(ENDPOINTS_REPOSITORY)
    private readonly endpoints: EndpointsRepository,
  ) {}

  async execute(tenantId: string, id: string): Promise<void> {
    await requireOwnedEndpoint(this.endpoints, tenantId, id);
    await this.endpoints.softDelete(id);
  }
}

