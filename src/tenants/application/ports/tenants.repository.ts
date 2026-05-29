import { Tenant } from "../../domain/tenant.entity";

export const TENANTS_REPOSITORY = Symbol("TENANTS_REPOSITORY");

export type CreateTenantInput = {
  name: string;
  secretKey: string;
  rateLimit?: number;
  endpointUrls?: string[];
};

export type UpdateTenantInput = {
  name?: string;
  rateLimit?: number;
};

export type TenantListQuery = {
  page: number;
  limit: number;
};

export type PaginatedTenants = {
  tenants: Tenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export interface TenantsRepository {
  create(input: CreateTenantInput): Promise<Tenant>;
  findAll(query: TenantListQuery): Promise<PaginatedTenants>;
  findById(id: string): Promise<Tenant | null>;
  update(id: string, input: UpdateTenantInput): Promise<Tenant>;
  delete(id: string): Promise<void>;
}
