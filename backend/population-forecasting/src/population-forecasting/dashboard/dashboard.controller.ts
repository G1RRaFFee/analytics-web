import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { FiltersResponse, FinalDataResponse } from '../contracts/api-contracts';
import { PopulationDataService } from '../data/population-data.service';
import { FinalDataRequestDto } from './dto/dashboard.dto';
import { DashboardService } from './dashboard.service';

type RequestWithId = Request & { requestId?: string };

@Controller('api/v1/dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dataService: PopulationDataService,
  ) {}

  @Post('final-data')
  getFinalData(
    @Req() request: RequestWithId,
    @Body() body: FinalDataRequestDto,
  ): FinalDataResponse {
    return this.dashboardService.getFinalData(request.requestId ?? 'unknown', body);
  }

  @Get('filters')
  getFilters(
    @Req() request: RequestWithId,
    @Query('subjectId') subjectId?: string,
  ): FiltersResponse {
    return {
      requestId: request.requestId ?? 'unknown',
      ...this.dataService.getFilters(subjectId),
    };
  }
}

