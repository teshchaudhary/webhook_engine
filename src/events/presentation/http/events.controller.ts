import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Headers, 
  HttpCode, 
  HttpStatus, 
  UnauthorizedException, 
  BadRequestException,
  Param,
  ParseUUIDPipe,
  Query
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { IngestEventUseCase } from '../../application/use-cases/ingest-event.use-case';
import { ListEventsUseCase } from '../../application/use-cases/list-events.use-case';
import { GetEventUseCase } from '../../application/use-cases/get-event.use-case';

@Controller('api/v1/events')
export class EventsController {
  constructor(
    private readonly ingestEvent: IngestEventUseCase,
    private readonly listEvents: ListEventsUseCase,
    private readonly getEvent: GetEventUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createEvent(
    @Headers('authorization') authHeader: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: CreateEventDto,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const tenantId = authHeader?.replace('Bearer ', '');
    if (!tenantId) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    return this.ingestEvent.execute({
      tenantId,
      idempotencyKey,
      type: dto.type,
      payload: dto.payload,
    });
  }

  @Get()
  async findAll(@Query() query: any) {
    const queryDto = plainToClass(QueryEventsDto, query);
    const errors = await validate(queryDto);

    if (errors.length > 0) {
      const errorMessages = errors.map(err => {
        if (err.constraints) {
          return Object.values(err.constraints).join(', ');
        }
        return 'Validation failed';
      }).join(', ');
      
      throw new BadRequestException(errorMessages);
    }

    return this.listEvents.execute(queryDto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getEvent.execute(id);
  }
}
