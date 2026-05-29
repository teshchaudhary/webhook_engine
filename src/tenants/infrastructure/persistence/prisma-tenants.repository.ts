import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../../prisma/prisma.service";
import { Tenant } from "../../domain/tenant.entity";
import {
  CreateTenantInput,
  PaginatedTenants,
  TenantListQuery,
  TenantsRepository,
  UpdateTenantInput,
} from "../../application/ports/tenants.repository";

type PrismaTenant = {
  id: string;
  name: string;
  secretKey: string;
  rateLimit: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PrismaTenantsRepository implements TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTenantInput): Promise<Tenant> {
    const tenant = await this.prisma.tenant.create({
      data: {
        name: input.name,
        secretKey: input.secretKey,
        rateLimit: input.rateLimit,
        endpoints: input.endpointUrls?.length
          ? {
              create: input.endpointUrls.map((url) => ({
                url,
                isActive: true,
              })),
            }
          : undefined,
      },
    });

    return this.toDomain(tenant);
  }

  async findAll(query: TenantListQuery): Promise<PaginatedTenants> {
    const skip = (query.page - 1) * query.limit;

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: query.limit,
      }),
      this.prisma.tenant.count(),
    ]);

    return {
      tenants: tenants.map((tenant) => this.toDomain(tenant)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNext: query.page * query.limit < total,
        hasPrev: query.page > 1,
      },
    };
  }

  async findById(id: string): Promise<Tenant | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    return tenant ? this.toDomain(tenant) : null;
  }

  async update(id: string, input: UpdateTenantInput): Promise<Tenant> {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: input,
    });

    return this.toDomain(tenant);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.tenant.delete({
      where: { id },
    });
  }

  private toDomain(tenant: PrismaTenant) {
    return new Tenant(tenant);
  }
}
