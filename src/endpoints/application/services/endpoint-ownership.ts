import { NotFoundException } from '@nestjs/common';
import { EndpointsRepository } from '../ports/endpoints.repository';

export async function requireOwnedEndpoint(
  endpoints: EndpointsRepository,
  tenantId: string,
  id: string,
): Promise<void> {
  const endpoint = await endpoints.findOwned(tenantId, id);
  if (!endpoint) {
    throw new NotFoundException('Endpoint not found');
  }
}

