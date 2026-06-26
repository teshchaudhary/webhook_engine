export const DELIVERY_CHANNEL = Symbol('DELIVERY_CHANNEL');

export interface DeliveryResult {
  status: number;
  data: string;
}

export interface DeliveryChannel {
  send(
    url: string,
    payload: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ): Promise<DeliveryResult>;
}
