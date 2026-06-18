import { EventStatus } from './event-status';

export type WebhookEventProps = {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  type: string;
  payload: unknown;
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
};

export class WebhookEvent {
  constructor(private readonly props: WebhookEventProps) {}

  get id() {
    return this.props.id;
  }

  get tenantId() {
    return this.props.tenantId;
  }

  get idempotencyKey() {
    return this.props.idempotencyKey;
  }

  get type() {
    return this.props.type;
  }

  get payload() {
    return this.props.payload;
  }

  get status() {
    return this.props.status;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get updatedAt() {
    return this.props.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      idempotencyKey: this.idempotencyKey,
      type: this.type,
      payload: this.payload,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
