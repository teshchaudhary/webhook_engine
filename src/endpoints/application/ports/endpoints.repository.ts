export const ENDPOINTS_REPOSITORY = Symbol('ENDPOINTS_REPOSITORY');

export type EndpointInput = {
  url: string;
  eventTypes: string[];
  rateLimit?: number;
};

export type EndpointUpdate = Partial<EndpointInput> & { isActive?: boolean };

export type EndpointSummary = {
  id: string;
  url: string;
  isActive: boolean;
  rateLimit: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  subscriptions: { eventType: string }[];
};

export interface EndpointsRepository {
  list(tenantId: string): Promise<EndpointSummary[]>;
  create(tenantId: string, input: EndpointInput & { secretKey: string }): Promise<EndpointSummary>;
  update(tenantId: string, id: string, input: EndpointUpdate): Promise<EndpointSummary>;
  findOwned(tenantId: string, id: string): Promise<{ id: string } | null>;
  softDelete(id: string): Promise<void>;
  findSecret(id: string): Promise<{ secretKey: string }>;
  rotateSecret(id: string, secretKey: string, previousSecretExpiresAt: Date): Promise<void>;
}
