import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { GetDeliveryUseCase } from '../../application/use-cases/get-delivery.use-case';
import { ListDeliveriesUseCase } from '../../application/use-cases/list-deliveries.use-case';
import { ReplayDeliveryUseCase } from '../../application/use-cases/replay-delivery.use-case';
import { TenantApiKeyGuard } from '../../../security/tenant-api-key.guard';
import { CurrentTenantId } from '../../../security/current-tenant.decorator';

@Controller('api/v1/deliveries')
@UseGuards(TenantApiKeyGuard)
export class DeliveriesController {
  constructor(
    private readonly listDeliveries: ListDeliveriesUseCase,
    private readonly getDelivery: GetDeliveryUseCase,
    private readonly replayDelivery: ReplayDeliveryUseCase,
  ) {}

  @Get()
  findAll(@CurrentTenantId() tenantId: string, @Query() query: QueryDeliveriesDto) {
    return this.listDeliveries.execute({ ...query, tenantId });
  }

  @Get(':id')
  findOne(@CurrentTenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.getDelivery.execute(id, tenantId);
  }

  @Post(':id/replay')
  @HttpCode(HttpStatus.ACCEPTED)
  async replay(@Param('id', ParseUUIDPipe) id: string, @CurrentTenantId() tenantId: string) {
    return this.replayDelivery.execute(id, tenantId);
  }
}
