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
  UseGuards,
} from '@nestjs/common';
import { AdminApiKeyGuard } from '../../../security/admin-api-key.guard';
import { CreateTenantUseCase } from '../../application/use-cases/create-tenant.use-case';
import { DeleteTenantUseCase } from '../../application/use-cases/delete-tenant.use-case';
import { GetTenantUseCase } from '../../application/use-cases/get-tenant.use-case';
import { ListTenantsUseCase } from '../../application/use-cases/list-tenants.use-case';
import { UpdateTenantUseCase } from '../../application/use-cases/update-tenant.use-case';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { QueryTenantsDto } from './dto/query-tenants.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { RotateTenantApiKeyUseCase } from '../../application/use-cases/rotate-tenant-api-key.use-case';

@Controller('api/v1/tenants')
@UseGuards(AdminApiKeyGuard)
export class TenantsController {
  constructor(
    private readonly createTenant: CreateTenantUseCase,
    private readonly listTenants: ListTenantsUseCase,
    private readonly getTenant: GetTenantUseCase,
    private readonly updateTenant: UpdateTenantUseCase,
    private readonly deleteTenant: DeleteTenantUseCase,
    private readonly rotateApiKey: RotateTenantApiKeyUseCase,
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

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getTenant.execute(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.updateTenant.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deleteTenant.execute(id);
  }

  @Post(':id/rotate-api-key')
  rotateKey(@Param('id', ParseUUIDPipe) id: string) {
    return this.rotateApiKey.execute(id);
  }
}
