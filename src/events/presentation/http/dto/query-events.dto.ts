import { IsString, IsOptional, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus } from '../../../domain/event-status';

export class QueryEventsDto {
  @IsOptional()
  @IsEnum(EventStatus)
  @Type(() => String)
  status?: EventStatus;

  @IsOptional()
  @IsString()
  type?: string;

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
