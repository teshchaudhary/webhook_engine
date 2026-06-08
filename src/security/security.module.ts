import { Module } from '@nestjs/common';
import { WEBHOOK_SIGNER } from './application/ports/webhook-signer.port';
import { WebhookSigningService } from './webhook-signing.service';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { TenantApiKeyGuard } from './tenant-api-key.guard';

@Module({
  providers: [
    WebhookSigningService,
    AdminApiKeyGuard,
    TenantApiKeyGuard,
    {
      provide: WEBHOOK_SIGNER,
      useExisting: WebhookSigningService,
    },
  ],
  exports: [WebhookSigningService, WEBHOOK_SIGNER, AdminApiKeyGuard, TenantApiKeyGuard],
})
export class SecurityModule {}
