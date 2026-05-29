import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DELIVERIES_REPOSITORY,
  DeliveriesRepository,
} from '../ports/deliveries.repository';
import {
  DELIVERY_REPLAY_QUEUE,
  DeliveryReplayQueue,
} from '../ports/delivery-replay-queue.port';

@Injectable()
export class ReplayDeliveryUseCase {
  private readonly logger = new Logger(ReplayDeliveryUseCase.name);

  constructor(
    @Inject(DELIVERIES_REPOSITORY)
    private readonly deliveriesRepository: DeliveriesRepository,
    @Inject(DELIVERY_REPLAY_QUEUE)
    private readonly replayQueue: DeliveryReplayQueue,
  ) {}

  async execute(id: string) {
    const delivery = await this.deliveriesRepository.findById(id);

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID ${id} not found`);
    }

    if (delivery.status === 'SUCCESS') {
      this.logger.warn(`Delivery ${id} is already successful, skipping replay`);
      return delivery;
    }

    const updatedDelivery = await this.deliveriesRepository.resetForReplay(id);
    await this.replayQueue.enqueueReplay(id);

    this.logger.log(`Delivery ${id} reset and enqueued for replay`);

    return updatedDelivery;
  }
}
