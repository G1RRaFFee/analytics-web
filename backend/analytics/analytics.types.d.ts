import type { AnalyticsContextResponse, AnalyticsReportResponse } from '../contracts/api-contracts';
export type AnalyticsContextPayload = Omit<AnalyticsContextResponse, 'requestId' | 'generatedAt'>;
export type AnalyticsReportPayload = Omit<AnalyticsReportResponse, 'requestId' | 'generatedAt'>;
export interface AnalyticsGenerationResult {
    provider: AnalyticsReportPayload['generation']['provider'];
    model: string | null;
    warning?: string;
    report: AnalyticsReportPayload['report'];
}
