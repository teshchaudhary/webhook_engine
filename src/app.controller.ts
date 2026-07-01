import { Controller, Get, Post, Body, Logger, HttpCode, Header } from '@nestjs/common';
import { AppService } from './app.service';
import { MetricsService } from './common/metrics.service';

@Controller()
export class AppController {
  private readonly logger = new Logger('TestWebhookReceiver');

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

  @Post('test-webhook')
  @HttpCode(200)
  receiveTestWebhook(@Body() payload: unknown) {
    this.logger.log(`Received test webhook! Payload: ${JSON.stringify(payload)}`);
    return { status: 'success', message: 'Webhook received' };
  }
}
