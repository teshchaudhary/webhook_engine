import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { DeliveryChannel, DeliveryResult } from '../interfaces/delivery-channel.interface';

@Injectable()
export class HttpDeliveryChannel implements DeliveryChannel {
  async send(
    url: string,
    payload: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<DeliveryResult> {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 10000,
    });

    return {
      status: response.status,
      data: typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data),
    };
  }
}
