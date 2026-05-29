import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from "class-validator";

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  rateLimit?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(25)
  @IsUrl({ require_tld: false }, { each: true })
  endpointUrls?: string[];
}
