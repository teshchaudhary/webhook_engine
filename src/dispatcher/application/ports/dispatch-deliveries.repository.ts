export const DISPATCH_DELIVERIES_REPOSITORY = Symbol(
  'DISPATCH_DELIVERIES_REPOSITORY',
);

export type DispatchableDelivery = any;

export type DeliveryFailureInput = {
  id: string;
  statusCode: number;
  responseSnippet: string;
  nextAttemptAt: Date;
};

export interface DispatchDeliveriesRepository {
  findById(id: string): Promise<DispatchableDelivery | null>;
  markProcessing(id: string, attempts: number): Promise<void>;
  markSuccess(id: string, statusCode: number, responseSnippet: string): Promise<void>;
  markDeadLetter(id: string, statusCode: number, responseSnippet: string): Promise<void>;
  markFailed(input: DeliveryFailureInput): Promise<void>;
  markRateLimited(id: string, nextAttemptAt: Date): Promise<void>;
}
