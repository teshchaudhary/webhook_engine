import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashApiKey } from './api-key';
import { TenantRequest } from './current-tenant.decorator';

@Injectable()
export class TenantApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer (whk_[a-f0-9]{64})$/i);

    if (!match) {
      throw new UnauthorizedException('A valid tenant API key is required');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { apiKeyHash: hashApiKey(match[1]), isActive: true },
      select: { id: true },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant API key');
    }

    request.tenantId = tenant.id;
    return true;
  }
}
