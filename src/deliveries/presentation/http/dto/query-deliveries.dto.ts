import { IsOptional, IsEnum, IsDateString, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryStatus } from '../../../domain/delivery-status';

export class QueryDeliveriesDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  @Type(() => String)
  status?: DeliveryStatus;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsUUID()
  endpointId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
