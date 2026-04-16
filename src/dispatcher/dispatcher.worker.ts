import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('webhook-deliveries')
export class DispatcherWorker extends WorkerHost {
  private readonly logger = new Logger(DispatcherWorker.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ deliveryId: string }>): Promise<any> {
    const { deliveryId } = job.data;
    
    this.logger.log(`Processing delivery job for delivery ID: ${deliveryId}`);

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        endpoint: true,
        event: true,
      },
    });

    if (!delivery) {
      this.logger.error(`Delivery ${deliveryId} not found`);
      return;
    }

    if (delivery.status === 'SUCCESS' || delivery.status === 'DLQ') {
      this.logger.log(`Delivery ${deliveryId} is already ${delivery.status}, skipping.`);
      return;
    }

    // 1. Mark as PROCESSING
    const attempts = delivery.attempts + 1;
    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { 
        status: 'PROCESSING',
        attempts, 
        lastAttemptAt: new Date() 
      },
    });

    try {
      // 2. HTTP Dispatch via Axios
      const response = await axios.post(
        delivery.endpoint.url,
        delivery.event.payload as any,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        },
      );

      // 3. Mark as SUCCESS
      await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'SUCCESS',
          httpStatusCode: response.status,
          responseSnippet: typeof response.data === 'string'
            ? response.data.substring(0, 255)
            : JSON.stringify(response.data)?.substring(0, 255) || 'OK',
        },
      });

      this.logger.log(`Delivery ${deliveryId} completed successfully (Status: ${response.status})`);
    } catch (error: any) {
      // 4. Mark as FAILED
      const status = error.response?.status || error.status || 500;
      const snippet = error.response?.data
        ? (typeof error.response.data === 'string'
            ? error.response.data.substring(0, 255)
            : JSON.stringify(error.response.data).substring(0, 255))
        : error.message.substring(0, 255);

      await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'FAILED',
          httpStatusCode: status,
          responseSnippet: snippet,
        },
      });

      this.logger.warn(`Delivery ${deliveryId} failed: ${error.message}`);
      
      // Rethrow so BullMQ knows the job failed (vital for Phase 5: Retries & DLQ)
      throw error;
    }
  }
}