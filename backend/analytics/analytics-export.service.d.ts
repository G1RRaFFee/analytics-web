import type { AnalyticsReportResponse, ReportFormat } from '../contracts/api-contracts';
export declare class AnalyticsExportService {
    export(report: AnalyticsReportResponse, format: ReportFormat): Promise<{
        buffer: Buffer;
        contentType: string;
        fileName: string;
    }>;
    private buildDocx;
    private buildPdf;
    private heading;
    private body;
    private bullet;
    private metadataLine;
    private fileNameBase;
    private loadPdfFont;
}
