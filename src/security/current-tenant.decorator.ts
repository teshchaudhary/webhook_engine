import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export type TenantRequest = Request & { tenantId: string };

export const CurrentTenantId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    return context.switchToHttp().getRequest<TenantRequest>().tenantId;
  },
);
