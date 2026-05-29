import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Query, 
  HttpCode, 
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
  Headers,
  UnauthorizedException
} from '@nestjs/common';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { GetDeliveryUseCase } from '../../application/use-cases/get-delivery.use-case';
import { ListDeliveriesUseCase } from '../../application/use-cases/list-deliveries.use-case';
import { ReplayDeliveryUseCase } from '../../application/use-cases/replay-delivery.use-case';

@Controller('api/v1/deliveries')
export class DeliveriesController {
  constructor(
    private readonly listDeliveries: ListDeliveriesUseCase,
    private readonly getDelivery: GetDeliveryUseCase,
    private readonly replayDelivery: ReplayDeliveryUseCase,
  ) {}

  @Get()
  async findAll(@Query() query: any) {
    const queryDto = plainToClass(QueryDeliveriesDto, query);
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

    return this.listDeliveries.execute(queryDto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getDelivery.execute(id);
  }

  @Post(':id/replay')
  @HttpCode(HttpStatus.ACCEPTED)
  async replay(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authHeader: string,
  ) {
    const tenantId = authHeader?.replace('Bearer ', '');
    if (!tenantId) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const delivery = await this.getDelivery.execute(id);
    if (delivery.event.tenantId !== tenantId) {
      throw new UnauthorizedException('Access denied');
    }

    return this.replayDelivery.execute(id);
  }
}
