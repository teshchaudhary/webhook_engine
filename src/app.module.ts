import 'dotenv/config';
import { Module } from '@nestjs/common';
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
import { EndpointsModule } from './endpoints/endpoints.module';
import { DevToolsModule } from './dev/dev-tools.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    SecurityModule,
    RedisModule,
    EventsModule,
    DispatcherModule,
    DeliveriesModule,
    TenantsModule,
    HealthModule,
    EndpointsModule,
    DevToolsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
