import { BadRequestException } from '@nestjs/common';
import { assertSafeWebhookUrl } from './safe-webhook-url';

describe('assertSafeWebhookUrl', () => {
  it('normalizes valid URLs', async () => {
    await expect(assertSafeWebhookUrl('https://example.com/webhooks')).resolves.toBe(
      'https://example.com/webhooks',
    );
  });

  it('rejects credentials and unsupported protocols', async () => {
    await expect(
      assertSafeWebhookUrl('https://user:pass@example.com/webhooks'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(assertSafeWebhookUrl('file:///etc/passwd')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
