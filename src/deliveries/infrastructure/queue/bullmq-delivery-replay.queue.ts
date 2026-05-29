import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DeliveryReplayQueue } from '../../application/ports/delivery-replay-queue.port';

@Injectable()
export class BullmqDeliveryReplayQueue implements DeliveryReplayQueue {
  constructor(
    @InjectQueue('webhook-deliveries')
    private readonly deliveryQueue: Queue,
  ) {}

  async enqueueReplay(deliveryId: string): Promise<void> {
    await this.deliveryQueue.add('deliver-webhook', { deliveryId });
  }
}
