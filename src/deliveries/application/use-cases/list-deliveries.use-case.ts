import { Inject, Injectable } from '@nestjs/common';
import {
  DeliveriesRepository,
  DeliveryListQuery,
  DELIVERIES_REPOSITORY,
} from '../ports/deliveries.repository';

@Injectable()
export class ListDeliveriesUseCase {
  constructor(
    @Inject(DELIVERIES_REPOSITORY)
    private readonly deliveriesRepository: DeliveriesRepository,
  ) {}

  execute(query: Partial<DeliveryListQuery>) {
    return this.deliveriesRepository.findAll({
      tenantId: query.tenantId,
      status: query.status,
      eventId: query.eventId,
      endpointId: query.endpointId,
      from: query.from,
      to: query.to,
      page: Number(query.page ?? 1),
      limit: Number(query.limit ?? 20),
    });
  }
}
