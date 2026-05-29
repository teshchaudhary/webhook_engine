import { DeliveryStatus } from '@prisma/client';
import { Delivery } from '../../domain/delivery.entity';

export const DELIVERIES_REPOSITORY = Symbol('DELIVERIES_REPOSITORY');

export type DeliveryListQuery = {
  tenantId?: string;
  status?: DeliveryStatus;
  eventId?: string;
  endpointId?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export type PaginatedDeliveries = {
  deliveries: unknown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export interface DeliveriesRepository {
  findAll(query: DeliveryListQuery): Promise<PaginatedDeliveries>;
  findById(id: string): Promise<any | null>;
  resetForReplay(id: string): Promise<Delivery>;
}
