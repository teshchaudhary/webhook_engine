import { Inject, Injectable } from '@nestjs/common';
import { EventListQuery, EVENTS_REPOSITORY, EventsRepository } from '../ports/events.repository';

@Injectable()
export class ListEventsUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  execute(query: Partial<EventListQuery>) {
    return this.eventsRepository.findAll({
      tenantId: query.tenantId as string,
      status: query.status,
      type: query.type,
      from: query.from,
      to: query.to,
      page: Number(query.page ?? 1),
      limit: Number(query.limit ?? 20),
    });
  }
}
