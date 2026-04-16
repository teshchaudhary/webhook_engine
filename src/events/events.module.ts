import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'webhook-deliveries',
    }),
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}