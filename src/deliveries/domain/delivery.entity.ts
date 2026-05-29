import { DeliveryStatus } from '@prisma/client';

export type DeliveryProps = {
  id: string;
  eventId: string;
  endpointId: string;
  status: DeliveryStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  nextAttemptAt: Date | null;
  httpStatusCode: number | null;
  responseSnippet: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class Delivery {
  constructor(private readonly props: DeliveryProps) {}

  get id() {
    return this.props.id;
  }

  get status() {
    return this.props.status;
  }

  toJSON() {
    return { ...this.props };
  }
}
