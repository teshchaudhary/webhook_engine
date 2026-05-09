import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from './common/config.module';
import { EventsModule } from './events/events.module';
import { DispatcherModule } from './dispatcher/dispatcher.module';
import { SecurityModule } from './security/security.module';
import { DeliveriesModule } from './deliveries/deliveries.module';

@Module({
  imports:[
    ConfigModule,
    PrismaModule,
    SecurityModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }),
    EventsModule,
    DispatcherModule,
    DeliveriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}