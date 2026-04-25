import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  CONFIDENCE_LEVELS,
  ENTITY_LEVELS,
  type ForecastMetricsRequest,
  type ForecastRequest,
} from '../../contracts/api-contracts';

export class ForecastRequestDto implements ForecastRequest {
  @IsIn(ENTITY_LEVELS)
  entityLevel!: 'region' | 'municipality';

  @IsString()
  entityId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(15)
  horizonYears!: number;

  @IsOptional()
  @Type(() => Number)
  @IsIn(CONFIDENCE_LEVELS)
  confidenceLevel?: 0.8 | 0.9 | 0.95;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  historyFromYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  historyToYear?: number;
}

export class ForecastMetricsRequestDto
  extends ForecastRequestDto
  implements ForecastMetricsRequest
{
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  @Max(15)
  backtestWindowYears?: number;
}

