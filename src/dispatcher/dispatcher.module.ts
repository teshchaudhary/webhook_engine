import { Module } from '@nestjs/common';
import { DispatcherWorker } from './dispatcher.worker';

@Module({
  providers: [DispatcherWorker],
})
export class DispatcherModule {}