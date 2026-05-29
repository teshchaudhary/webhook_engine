export const DELAYED_DELIVERY_QUEUE = Symbol('DELAYED_DELIVERY_QUEUE');

export interface DelayedDeliveryQueue {
  enqueueDelayed(deliveryId: string, delayMs: number): Promise<void>;
}
