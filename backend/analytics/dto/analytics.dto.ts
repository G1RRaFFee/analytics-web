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
  REPORT_FORMATS,
  type AnalyticsContextRequest,
  type AnalyticsExportRequest,
} from '../../contracts/api-contracts';

export class AnalyticsContextRequestDto implements AnalyticsContextRequest {
  @IsIn(ENTITY_LEVELS)
  entityLevel!: 'region' | 'municipality';

  @IsString()
  entityId!: string;

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

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(10)
  horizonYears!: number;

  @IsOptional()
  @Type(() => Number)
  @IsIn(CONFIDENCE_LEVELS)
  confidenceLevel?: 0.8 | 0.9 | 0.95;
}

export class AnalyticsExportRequestDto
  extends AnalyticsContextRequestDto
  implements AnalyticsExportRequest
{
  @IsIn(REPORT_FORMATS)
  format!: 'pdf' | 'docx';
}
