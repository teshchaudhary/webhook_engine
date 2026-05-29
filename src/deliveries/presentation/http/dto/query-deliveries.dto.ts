import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryStatus } from '@prisma/client';

export class QueryDeliveriesDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsEnum(DeliveryStatus)
  @Type(() => String)
  status?: DeliveryStatus;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  endpointId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
