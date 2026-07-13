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
  UseGuards,
} from '@nestjs/common';
import { CreateEndpointUseCase } from '../../application/use-cases/create-endpoint.use-case';
import { DeleteEndpointUseCase } from '../../application/use-cases/delete-endpoint.use-case';
import { ListEndpointsUseCase } from '../../application/use-cases/list-endpoints.use-case';
import { RotateEndpointSecretUseCase } from '../../application/use-cases/rotate-endpoint-secret.use-case';
import { UpdateEndpointUseCase } from '../../application/use-cases/update-endpoint.use-case';
import { CurrentTenantId } from '../../../security/current-tenant.decorator';
import { TenantApiKeyGuard } from '../../../security/tenant-api-key.guard';
import { CreateEndpointDto, UpdateEndpointDto } from './dto/endpoint.dto';

@Controller('api/v1/endpoints')
@UseGuards(TenantApiKeyGuard)
export class EndpointsController {
  constructor(
    private readonly listEndpoints: ListEndpointsUseCase,
    private readonly createEndpoint: CreateEndpointUseCase,
    private readonly updateEndpoint: UpdateEndpointUseCase,
    private readonly deleteEndpoint: DeleteEndpointUseCase,
    private readonly rotateEndpointSecret: RotateEndpointSecretUseCase,
  ) {}

  @Get()
  list(@CurrentTenantId() tenantId: string) {
    return this.listEndpoints.execute(tenantId);
  }

  @Post()
  create(@CurrentTenantId() tenantId: string, @Body() dto: CreateEndpointDto) {
    return this.createEndpoint.execute(tenantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEndpointDto,
  ) {
    return this.updateEndpoint.execute(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.deleteEndpoint.execute(tenantId, id);
  }

  @Post(':id/rotate-secret')
  rotateSecret(@CurrentTenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.rotateEndpointSecret.execute(tenantId, id);
  }
}
