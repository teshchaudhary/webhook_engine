export const EventStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  DONE: 'DONE',
  FAILED: 'FAILED',
  NO_SUBSCRIBERS: 'NO_SUBSCRIBERS',
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];
