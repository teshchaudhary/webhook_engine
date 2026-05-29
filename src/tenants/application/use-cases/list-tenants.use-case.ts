import { Inject, Injectable } from "@nestjs/common";
import {
  TENANTS_REPOSITORY,
  TenantsRepository,
} from "../ports/tenants.repository";

export type ListTenantsQuery = {
  page?: number;
  limit?: number;
};

@Injectable()
export class ListTenantsUseCase {
  constructor(
    @Inject(TENANTS_REPOSITORY)
    private readonly tenantsRepository: TenantsRepository,
  ) {}

  execute(query: ListTenantsQuery) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);

    return this.tenantsRepository.findAll({
      page,
      limit,
    });
  }
}
