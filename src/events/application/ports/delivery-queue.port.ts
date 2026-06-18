export const DELIVERY_QUEUE = Symbol('DELIVERY_QUEUE');

export interface DeliveryQueue {
  publishPending(): Promise<void>;
}
