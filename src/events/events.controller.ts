import { Controller, Post, Body, Headers, HttpCode, HttpStatus, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

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
}