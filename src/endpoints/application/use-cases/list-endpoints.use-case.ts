import { Inject, Injectable } from '@nestjs/common';
import {
  ENDPOINTS_REPOSITORY,
  EndpointsRepository,
} from '../ports/endpoints.repository';

@Injectable()
export class ListEndpointsUseCase {
  constructor(
    @Inject(ENDPOINTS_REPOSITORY)
    private readonly endpoints: EndpointsRepository,
  ) {}

  execute(tenantId: string) {
    return this.endpoints.list(tenantId);
  }
}

