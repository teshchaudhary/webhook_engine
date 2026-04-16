import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { DispatcherModule } from './dispatcher/dispatcher.module';

@Module({
  imports:[
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }),
    EventsModule,
    DispatcherModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}