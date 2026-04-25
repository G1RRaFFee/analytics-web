import type { AnalyticsGenerationResult, AnalyticsContextPayload } from './analytics.types';
export declare class AnalyticsGigachatService {
    private cachedToken;
    private cachedTokenExpiresAt;
    isEnabled(): boolean;
    generateReport(context: AnalyticsContextPayload): Promise<AnalyticsGenerationResult>;
    private getAccessToken;
    private parseReport;
    private requireString;
    private requireStringArray;
    private requestJson;
    private errorMessage;
    private authorizationHeader;
    private scope;
    private modelName;
    private apiBaseUrl;
    private authUrl;
    private isDisabled;
    private ignoreTlsErrors;
    private caCertificate;
    private joinUrl;
}
