import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '../common/config.service';
import { safeEqual } from './api-key';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const supplied = request.header('x-admin-api-key') ?? '';
    if (!safeEqual(supplied, this.config.adminApiKey)) {
      throw new ForbiddenException('A valid admin API key is required');
    }
    return true;
  }
}
