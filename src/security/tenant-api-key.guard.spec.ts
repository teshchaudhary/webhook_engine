import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { hashApiKey } from './api-key';
import { TenantApiKeyGuard } from './tenant-api-key.guard';

describe('TenantApiKeyGuard', () => {
  const apiKey = `whk_${'a'.repeat(64)}`;

  it('authenticates the key and attaches the tenant id', async () => {
    const request = { headers: { authorization: `Bearer ${apiKey}` } };
    const prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1' }) },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(new TenantApiKeyGuard(prisma as any).canActivate(context)).resolves.toBe(true);
    expect(request).toMatchObject({ tenantId: 'tenant-1' });
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { apiKeyHash: hashApiKey(apiKey), isActive: true },
      select: { id: true },
    });
  });

  it('rejects tenant ids masquerading as bearer credentials', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer tenant-uuid' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(new TenantApiKeyGuard({} as any).canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
