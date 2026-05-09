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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

@Controller('api/v1/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

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

    return this.eventsService.ingestEvent(tenantId, idempotencyKey, dto);
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

    return this.eventsService.findAll(queryDto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(id);
  }
}