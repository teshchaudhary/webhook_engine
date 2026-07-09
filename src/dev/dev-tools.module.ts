import { Module } from '@nestjs/common';
import { TestWebhookController } from './test-webhook.controller';

@Module({
  controllers: [TestWebhookController],
})
export class DevToolsModule {}
