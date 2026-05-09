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
import { DeliveriesService } from './deliveries.service';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

@Controller('api/v1/deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

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

    return this.deliveriesService.findAll(queryDto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.deliveriesService.findOne(id);
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

    const delivery = await this.deliveriesService.findOne(id);
    if (delivery.event.tenantId !== tenantId) {
      throw new UnauthorizedException('Access denied');
    }

    return this.deliveriesService.replay(id);
  }
}
