import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';
import { MetricsService } from './common/metrics.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly metrics: MetricsService,
  ) {}

  @Get()
  getRoot() {
    return this.appService.getRoot();
  }

  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4')
  getMetrics() {
    return this.metrics.render();
  }
}
