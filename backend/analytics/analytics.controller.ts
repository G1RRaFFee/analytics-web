import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type {
  AnalyticsContextResponse,
  AnalyticsReportResponse,
} from '../contracts/api-contracts';
import { AnalyticsContextRequestDto, AnalyticsExportRequestDto } from './dto/analytics.dto';
import { AnalyticsService } from './analytics.service';

type RequestWithId = Request & { requestId?: string };

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('context')
  getContext(
    @Req() request: RequestWithId,
    @Body() body: AnalyticsContextRequestDto,
  ): AnalyticsContextResponse {
    return this.analyticsService.getContext(request.requestId ?? 'unknown', body);
  }

  @Post('report')
  async getReport(
    @Req() request: RequestWithId,
    @Body() body: AnalyticsContextRequestDto,
  ): Promise<AnalyticsReportResponse> {
    return this.analyticsService.generateReport(request.requestId ?? 'unknown', body);
  }

  @Post('report/export')
  async exportReport(
    @Req() request: RequestWithId,
    @Res({ passthrough: true }) response: Response,
    @Body() body: AnalyticsExportRequestDto,
  ): Promise<StreamableFile> {
    const exported = await this.analyticsService.exportReport(
      request.requestId ?? 'unknown',
      body,
    );

    response.setHeader('Content-Type', exported.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${exported.fileName}"`);

    return new StreamableFile(exported.buffer);
  }
}
