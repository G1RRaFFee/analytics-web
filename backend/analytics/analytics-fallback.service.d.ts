import type { AnalyticsReportPayload, AnalyticsContextPayload } from './analytics.types';
export declare class AnalyticsFallbackService {
    buildReport(context: AnalyticsContextPayload): AnalyticsReportPayload['report'];
    private buildExecutiveSummary;
    private buildTrends;
    private buildForecastAssessment;
    private buildPolicyRecommendations;
    private buildPlanningRecommendations;
    private unique;
    private formatInt;
    private formatPercent;
    private formatSigned;
}
