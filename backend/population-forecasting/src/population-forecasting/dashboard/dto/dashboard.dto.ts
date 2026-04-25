import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CONFIDENCE_LEVELS,
  ENTITY_LEVELS,
  MUNICIPALITY_TYPES,
  SORT_FIELDS,
  SORT_ORDERS,
  type FinalDataRequest,
} from '../../contracts/api-contracts';

class SelectedEntityDto {
  @IsIn(ENTITY_LEVELS)
  entityLevel!: 'region' | 'municipality';

  @IsString()
  entityId!: string;
}

export class FinalDataRequestDto implements FinalDataRequest {
  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsIn(MUNICIPALITY_TYPES)
  municipalityType?: 'urban_okrug' | 'municipal_raion' | 'municipal_okrug';

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  periodFromYear!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  periodToYear!: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;

  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortBy?:
    | 'population'
    | 'changePercent'
    | 'birthRate'
    | 'deathRate'
    | 'migrationRate'
    | 'naturalGrowth';

  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @ValidateNested()
  @Type(() => SelectedEntityDto)
  selectedEntity?: SelectedEntityDto;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeForecast?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(15)
  horizonYears?: number;

  @IsOptional()
  @Type(() => Number)
  @IsIn(CONFIDENCE_LEVELS)
  confidenceLevel?: 0.8 | 0.9 | 0.95;
}

