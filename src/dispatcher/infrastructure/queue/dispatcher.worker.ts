import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { readWorkerConcurrency } from '../../../common/config.service';
import { ProcessDeliveryUseCase } from '../../application/use-cases/process-delivery.use-case';

@Processor('webhook-deliveries', {
  concurrency: readWorkerConcurrency(),
})
export class DispatcherWorker extends WorkerHost {
  constructor(private readonly processDelivery: ProcessDeliveryUseCase) {
    super();
  }

  async process(job: Job<{ deliveryId: string; expectedAttempt: number }>): Promise<void> {
    await this.processDelivery.execute(job.data.deliveryId, job.data.expectedAttempt);
  }
}
