import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  Matches,
} from 'class-validator';

const EVENT_TYPE_PATTERN = /^(\*|[a-z0-9]+(?:[._-][a-z0-9]+)*)$/;

export class CreateEndpointDto {
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  url: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @Matches(EVENT_TYPE_PATTERN, { each: true })
  eventTypes: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  rateLimit?: number;
}

export class UpdateEndpointDto {
  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  url?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @Matches(EVENT_TYPE_PATTERN, { each: true })
  eventTypes?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  rateLimit?: number;
}
