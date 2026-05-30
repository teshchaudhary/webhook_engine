import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot() {
    return {
      name: 'webhook-engine',
      status: 'ok',
      runtime: 'foundation',
    };
  }
}
