import { Module } from '@nestjs/common';
import { WebhookSigningService } from './webhook-signing.service';

@Module({
  providers: [WebhookSigningService],
  exports: [WebhookSigningService],
})
export class SecurityModule {}