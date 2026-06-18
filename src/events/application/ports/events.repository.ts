import { EventStatus } from '../../domain/event-status';
import { WebhookEvent } from '../../domain/webhook-event.entity';

export const EVENTS_REPOSITORY = Symbol('EVENTS_REPOSITORY');

export type CreateWebhookEventInput = {
  tenantId: string;
  idempotencyKey: string;
  type: string;
  payload: Record<string, unknown>;
};

export type CreateWebhookEventResult = {
  event: WebhookEvent;
  deliveryIds: string[];
};

export type EventListQuery = {
  tenantId: string;
  status?: EventStatus;
  type?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export type PaginatedEvents = {
  events: unknown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export interface EventsRepository {
  createForTenant(input: CreateWebhookEventInput): Promise<CreateWebhookEventResult>;
  findAll(query: EventListQuery): Promise<PaginatedEvents>;
  findById(id: string, tenantId: string): Promise<unknown | null>;
}
