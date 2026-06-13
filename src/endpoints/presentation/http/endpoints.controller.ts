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
import { EndpointsService } from '../../application/endpoints.service';
import { CurrentTenantId } from '../../../security/current-tenant.decorator';
import { TenantApiKeyGuard } from '../../../security/tenant-api-key.guard';
import { CreateEndpointDto, UpdateEndpointDto } from './dto/endpoint.dto';

@Controller('api/v1/endpoints')
@UseGuards(TenantApiKeyGuard)
export class EndpointsController {
  constructor(private readonly endpoints: EndpointsService) {}

  @Get()
  list(@CurrentTenantId() tenantId: string) {
    return this.endpoints.list(tenantId);
  }

  @Post()
  create(@CurrentTenantId() tenantId: string, @Body() dto: CreateEndpointDto) {
    return this.endpoints.create(tenantId, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEndpointDto,
  ) {
    return this.endpoints.update(tenantId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.endpoints.remove(tenantId, id);
  }

  @Post(':id/rotate-secret')
  rotateSecret(@CurrentTenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.endpoints.rotateSecret(tenantId, id);
  }
}
