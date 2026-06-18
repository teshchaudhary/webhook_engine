export const EventStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];
