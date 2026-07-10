import { DeliveryStatus } from '../../../deliveries/domain/delivery-status';

export function calculateEventStatus(deliveryStatuses: DeliveryStatus[]): 'PROCESSING' | 'FAILED' | 'DONE' {
  const unfinished = deliveryStatuses.some((status) =>
    ['PENDING', 'PROCESSING', 'FAILED'].includes(status),
  );
  if (unfinished) {
    return 'PROCESSING';
  }

  const hasTerminalFailure = deliveryStatuses.some((status) => ['DLQ', 'CANCELLED'].includes(status));
  return hasTerminalFailure ? 'FAILED' : 'DONE';
}
