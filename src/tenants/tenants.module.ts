import { Module } from "@nestjs/common";
import { TENANTS_REPOSITORY } from "./application/ports/tenants.repository";
import { CreateTenantUseCase } from "./application/use-cases/create-tenant.use-case";
import { DeleteTenantUseCase } from "./application/use-cases/delete-tenant.use-case";
import { GetTenantUseCase } from "./application/use-cases/get-tenant.use-case";
import { ListTenantsUseCase } from "./application/use-cases/list-tenants.use-case";
import { UpdateTenantUseCase } from "./application/use-cases/update-tenant.use-case";
import { PrismaTenantsRepository } from "./infrastructure/persistence/prisma-tenants.repository";
import { TenantsController } from "./presentation/http/tenants.controller";

@Module({
  controllers: [TenantsController],
  providers: [
    CreateTenantUseCase,
    ListTenantsUseCase,
    GetTenantUseCase,
    UpdateTenantUseCase,
    DeleteTenantUseCase,
    {
      provide: TENANTS_REPOSITORY,
      useClass: PrismaTenantsRepository,
    },
  ],
})
export class TenantsModule {}
