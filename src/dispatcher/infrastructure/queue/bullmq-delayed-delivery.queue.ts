import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DelayedDeliveryQueue } from '../../application/ports/delayed-delivery-queue.port';

@Injectable()
export class BullmqDelayedDeliveryQueue implements DelayedDeliveryQueue {
  constructor(
    @InjectQueue('webhook-deliveries')
    private readonly deliveryQueue: Queue,
  ) {}

  async enqueueDelayed(deliveryId: string, delayMs: number): Promise<void> {
    await this.deliveryQueue.add(
      'deliver-webhook',
      { deliveryId },
      { delay: delayMs },
    );
  }
}
