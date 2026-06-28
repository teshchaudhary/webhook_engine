import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { DeliveryChannel, DeliveryResult } from '../../application/ports/delivery-channel.port';
import { ConfigService } from '../../../common/config.service';
import { assertSafeWebhookUrl } from '../../../endpoints/infrastructure/safe-webhook-url';

@Injectable()
export class HttpDeliveryChannelAdapter implements DeliveryChannel {
  constructor(private readonly config: ConfigService) {}

  async send(
    url: string,
    payload: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ): Promise<DeliveryResult> {
    await assertSafeWebhookUrl(url);
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: this.config.timeout,
      maxRedirects: 0,
    });

    return {
      status: response.status,
      data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
    };
  }
}
