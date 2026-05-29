export const DELIVERY_QUEUE = Symbol('DELIVERY_QUEUE');

export interface DeliveryQueue {
  enqueueDeliveries(deliveryIds: string[]): Promise<void>;
}
