import { Module } from '@nestjs/common';
import { DispatcherWorker } from './dispatcher.worker';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [SecurityModule],
  providers: [DispatcherWorker],
})
export class DispatcherModule {}