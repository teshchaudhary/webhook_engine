import { Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import {
  TENANTS_REPOSITORY,
  TenantsRepository,
} from "../ports/tenants.repository";

export type CreateTenantCommand = {
  name: string;
  rateLimit?: number;
  endpointUrls?: string[];
};

@Injectable()
export class CreateTenantUseCase {
  constructor(
    @Inject(TENANTS_REPOSITORY)
    private readonly tenantsRepository: TenantsRepository,
  ) {}

  execute(command: CreateTenantCommand) {
    return this.tenantsRepository.create({
      ...command,
      secretKey: `whsec_${randomBytes(32).toString("hex")}`,
    });
  }
}
