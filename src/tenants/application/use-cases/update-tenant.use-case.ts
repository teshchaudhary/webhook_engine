import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  TENANTS_REPOSITORY,
  TenantsRepository,
  UpdateTenantInput,
} from "../ports/tenants.repository";

@Injectable()
export class UpdateTenantUseCase {
  constructor(
    @Inject(TENANTS_REPOSITORY)
    private readonly tenantsRepository: TenantsRepository,
  ) {}

  async execute(id: string, input: UpdateTenantInput) {
    const tenant = await this.tenantsRepository.findById(id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return this.tenantsRepository.update(id, input);
  }
}
