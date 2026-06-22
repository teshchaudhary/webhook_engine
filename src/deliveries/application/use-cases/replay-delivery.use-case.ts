import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DELIVERIES_REPOSITORY, DeliveriesRepository } from '../ports/deliveries.repository';

@Injectable()
export class ReplayDeliveryUseCase {
  private readonly logger = new Logger(ReplayDeliveryUseCase.name);

  constructor(
    @Inject(DELIVERIES_REPOSITORY)
    private readonly deliveriesRepository: DeliveriesRepository,
  ) {}

  async execute(id: string, tenantId: string) {
    const delivery = await this.deliveriesRepository.findById(id, tenantId);

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    if (delivery.status === 'SUCCESS') {
      this.logger.warn(`Delivery ${id} is already successful, skipping replay`);
      return delivery;
    }

    const updatedDelivery = await this.deliveriesRepository.resetForReplay(id);

    this.logger.log(`Delivery ${id} reset and scheduled for replay`);

    return updatedDelivery;
  }
}
