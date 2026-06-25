export const DISPATCH_DELIVERIES_REPOSITORY = Symbol('DISPATCH_DELIVERIES_REPOSITORY');

export type DispatchableDelivery = {
  id: string;
  status: string;
  attempts: number;
  endpoint: {
    id: string;
    url: string;
    secretKey: string;
    previousSecretKey: string | null;
    previousSecretExpiresAt: Date | null;
    rateLimit: number | null;
    isActive: boolean;
  };
  event: {
    id: string;
    type: string;
    payload: unknown;
    createdAt: Date;
    tenant: {
      id: string;
      name: string;
      rateLimit: number;
    };
  };
};

export type DeliveryFailureInput = {
  id: string;
  statusCode: number;
  responseSnippet: string;
  nextAttemptAt: Date;
  nextAttemptNumber: number;
};

export interface DispatchDeliveriesRepository {
  findById(id: string): Promise<DispatchableDelivery | null>;
  claimForProcessing(id: string, expectedAttempt: number): Promise<DispatchableDelivery | null>;
  markSuccess(id: string, statusCode: number, responseSnippet: string): Promise<void>;
  markDeadLetter(id: string, statusCode: number, responseSnippet: string): Promise<void>;
  markCancelled(id: string, reason: string): Promise<void>;
  markFailedAndSchedule(input: DeliveryFailureInput): Promise<void>;
  markRateLimitedAndSchedule(id: string, nextAttemptAt: Date, attemptNumber: number): Promise<void>;
}
