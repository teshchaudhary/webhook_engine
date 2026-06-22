import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveriesRepository, DELIVERIES_REPOSITORY } from '../ports/deliveries.repository';

@Injectable()
export class GetDeliveryUseCase {
  constructor(
    @Inject(DELIVERIES_REPOSITORY)
    private readonly deliveriesRepository: DeliveriesRepository,
  ) {}

  async execute(id: string, tenantId: string) {
    const delivery = await this.deliveriesRepository.findById(id, tenantId);

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    return delivery;
  }
}
