export const DELIVERY_REPLAY_QUEUE = Symbol('DELIVERY_REPLAY_QUEUE');

export interface DeliveryReplayQueue {
  enqueueReplay(deliveryId: string): Promise<void>;
}
