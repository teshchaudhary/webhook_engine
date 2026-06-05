import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();

  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  render(): string {
    return [...this.counters.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => `webhook_engine_${name} ${value}`)
      .join('\n');
  }
}
