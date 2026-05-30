import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from './common/config.module';
import { RedisModule } from './common/redis.module';
import { EventsModule } from './events/events.module';
import { DispatcherModule } from './dispatcher/dispatcher.module';
import { SecurityModule } from './security/security.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { TenantsModule } from './tenants/tenants.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    SecurityModule,
    RedisModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }),
    EventsModule,
    DispatcherModule,
    DeliveriesModule,
    TenantsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
