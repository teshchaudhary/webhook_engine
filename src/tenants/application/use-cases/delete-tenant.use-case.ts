import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  TENANTS_REPOSITORY,
  TenantsRepository,
} from "../ports/tenants.repository";

@Injectable()
export class DeleteTenantUseCase {
  constructor(
    @Inject(TENANTS_REPOSITORY)
    private readonly tenantsRepository: TenantsRepository,
  ) {}

  async execute(id: string) {
    const tenant = await this.tenantsRepository.findById(id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    await this.tenantsRepository.delete(id);
  }
}
