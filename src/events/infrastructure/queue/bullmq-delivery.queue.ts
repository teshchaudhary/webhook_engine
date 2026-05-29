import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DeliveryQueue } from '../../application/ports/delivery-queue.port';

@Injectable()
export class BullmqDeliveryQueue implements DeliveryQueue {
  constructor(
    @InjectQueue('webhook-deliveries')
    private readonly deliveryQueue: Queue,
  ) {}

  async enqueueDeliveries(deliveryIds: string[]): Promise<void> {
    if (deliveryIds.length === 0) {
      return;
    }

    await this.deliveryQueue.addBulk(
      deliveryIds.map((deliveryId) => ({
        name: 'deliver-webhook',
        data: { deliveryId },
      })),
    );
  }
}
