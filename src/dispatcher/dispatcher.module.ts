import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DispatcherWorker } from './dispatcher.worker';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    SecurityModule,
    BullModule.registerQueue({
      name: 'webhook-deliveries',
    }),
  ],
  providers: [DispatcherWorker],
})
export class DispatcherModule {}