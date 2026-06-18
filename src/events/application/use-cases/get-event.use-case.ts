import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EVENTS_REPOSITORY, EventsRepository } from '../ports/events.repository';

@Injectable()
export class GetEventUseCase {
  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: EventsRepository,
  ) {}

  async execute(id: string, tenantId: string) {
    const event = await this.eventsRepository.findById(id, tenantId);

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }
}
