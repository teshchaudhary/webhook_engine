import { Module } from '@nestjs/common';
import { WEBHOOK_SIGNER } from './application/ports/webhook-signer.port';
import { WebhookSigningService } from './webhook-signing.service';

@Module({
  providers: [
    WebhookSigningService,
    {
      provide: WEBHOOK_SIGNER,
      useExisting: WebhookSigningService,
    },
  ],
  exports: [WebhookSigningService, WEBHOOK_SIGNER],
})
export class SecurityModule {}
