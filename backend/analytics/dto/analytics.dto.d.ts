import { type AnalyticsContextRequest, type AnalyticsExportRequest } from '../../contracts/api-contracts';
export declare class AnalyticsContextRequestDto implements AnalyticsContextRequest {
    entityLevel: 'region' | 'municipality';
    entityId: string;
    year: number;
    periodFromYear: number;
    periodToYear: number;
    horizonYears: number;
    confidenceLevel?: 0.8 | 0.9 | 0.95;
}
export declare class AnalyticsExportRequestDto extends AnalyticsContextRequestDto implements AnalyticsExportRequest {
    format: 'pdf' | 'docx';
}
