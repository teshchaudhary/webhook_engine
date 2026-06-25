import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ProcessDeliveryUseCase } from '../../application/use-cases/process-delivery.use-case';

@Processor('webhook-deliveries', {
  concurrency: Number(process.env.WORKER_CONCURRENCY ?? 10),
})
export class DispatcherWorker extends WorkerHost {
  constructor(private readonly processDelivery: ProcessDeliveryUseCase) {
    super();
  }

  async process(job: Job<{ deliveryId: string; expectedAttempt: number }>): Promise<void> {
    await this.processDelivery.execute(job.data.deliveryId, job.data.expectedAttempt);
  }
}
