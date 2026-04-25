import { StreamableFile } from "@nestjs/common";
import type { Request, Response } from "express";
import type { AnalyticsContextResponse, AnalyticsReportResponse } from '../contracts/api-contracts';
import { AnalyticsContextRequestDto, AnalyticsExportRequestDto } from './dto/analytics.dto';
import { AnalyticsService } from './analytics.service';
type RequestWithId = Request & {
    requestId?: string;
};
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getContext(request: RequestWithId, body: AnalyticsContextRequestDto): AnalyticsContextResponse;
    getReport(request: RequestWithId, body: AnalyticsContextRequestDto): Promise<AnalyticsReportResponse>;
    exportReport(request: RequestWithId, response: Response, body: AnalyticsExportRequestDto): Promise<StreamableFile>;
}
export {};
