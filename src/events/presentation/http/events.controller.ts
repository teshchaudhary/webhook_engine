import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { IngestEventUseCase } from '../../application/use-cases/ingest-event.use-case';
import { ListEventsUseCase } from '../../application/use-cases/list-events.use-case';
import { GetEventUseCase } from '../../application/use-cases/get-event.use-case';
import { TenantApiKeyGuard } from '../../../security/tenant-api-key.guard';
import { CurrentTenantId } from '../../../security/current-tenant.decorator';

@Controller('api/v1/events')
@UseGuards(TenantApiKeyGuard)
export class EventsController {
  constructor(
    private readonly ingestEvent: IngestEventUseCase,
    private readonly listEvents: ListEventsUseCase,
    private readonly getEvent: GetEventUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createEvent(
    @CurrentTenantId() tenantId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: CreateEventDto,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return this.ingestEvent.execute({
      tenantId,
      idempotencyKey,
      type: dto.type,
      payload: dto.payload,
    });
  }

  @Get()
  findAll(@CurrentTenantId() tenantId: string, @Query() query: QueryEventsDto) {
    return this.listEvents.execute({ ...query, tenantId });
  }

  @Get(':id')
  findOne(@CurrentTenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.getEvent.execute(id, tenantId);
  }
}
