import { Body, Controller, HttpCode, Logger, NotFoundException, Post } from '@nestjs/common';
import { ConfigService } from '../common/config.service';

@Controller()
export class TestWebhookController {
  private readonly logger = new Logger('TestWebhookReceiver');

  constructor(private readonly config: ConfigService) {}

  @Post('test-webhook')
  @HttpCode(200)
  receive(@Body() payload: unknown) {
    if (this.config.isProduction) {
      throw new NotFoundException();
    }

    this.logger.log(`Received test webhook! Payload: ${JSON.stringify(payload)}`);
    return { status: 'success', message: 'Webhook received' };
  }
}
