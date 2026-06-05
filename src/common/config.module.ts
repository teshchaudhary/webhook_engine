import { Module, Global } from '@nestjs/common';
import { ConfigService } from './config.service';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  providers: [ConfigService, MetricsService],
  exports: [ConfigService, MetricsService],
})
export class ConfigModule {}
