import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { generateApiKey, hashApiKey } from '../../../security/api-key';
import { TENANTS_REPOSITORY, TenantsRepository } from '../ports/tenants.repository';

@Injectable()
export class RotateTenantApiKeyUseCase {
  constructor(
    @Inject(TENANTS_REPOSITORY)
    private readonly tenants: TenantsRepository,
  ) {}

  async execute(id: string) {
    if (!(await this.tenants.findById(id))) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    const apiKey = generateApiKey();
    await this.tenants.updateApiKeyHash(id, hashApiKey(apiKey));
    return {
      tenantId: id,
      apiKey,
      message: 'Store this API key securely; the previous key is now invalid.',
    };
  }
}
