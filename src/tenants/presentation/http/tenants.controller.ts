import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CreateTenantUseCase } from "../../application/use-cases/create-tenant.use-case";
import { DeleteTenantUseCase } from "../../application/use-cases/delete-tenant.use-case";
import { GetTenantUseCase } from "../../application/use-cases/get-tenant.use-case";
import { ListTenantsUseCase } from "../../application/use-cases/list-tenants.use-case";
import { UpdateTenantUseCase } from "../../application/use-cases/update-tenant.use-case";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { QueryTenantsDto } from "./dto/query-tenants.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";

@Controller("api/v1/tenants")
export class TenantsController {
  constructor(
    private readonly createTenant: CreateTenantUseCase,
    private readonly listTenants: ListTenantsUseCase,
    private readonly getTenant: GetTenantUseCase,
    private readonly updateTenant: UpdateTenantUseCase,
    private readonly deleteTenant: DeleteTenantUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTenantDto) {
    return this.createTenant.execute(dto);
  }

  @Get()
  findAll(@Query() query: QueryTenantsDto) {
    return this.listTenants.execute(query);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.getTenant.execute(id);
  }

  @Patch(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.updateTenant.execute(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.deleteTenant.execute(id);
  }
}
