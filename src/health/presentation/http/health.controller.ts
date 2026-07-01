import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { GetHealthUseCase } from '../../application/use-cases/get-health.use-case';

@Controller()
export class HealthController {
  constructor(private readonly getHealth: GetHealthUseCase) {}

  @Get('health')
  async check(@Res({ passthrough: true }) response: Response) {
    const health = await this.getHealth.execute();
    if (health.status !== 'ok') {
      response.status(503);
    }
    return health;
  }

  @Get('health/live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
