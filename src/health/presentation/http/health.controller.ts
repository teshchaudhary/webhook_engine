import { Controller, Get } from '@nestjs/common';
import { GetHealthUseCase } from '../../application/use-cases/get-health.use-case';

@Controller()
export class HealthController {
  constructor(private readonly getHealth: GetHealthUseCase) {}

  @Get('health')
  check() {
    return this.getHealth.execute();
  }
}
