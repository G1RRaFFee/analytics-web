import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  ForecastMetricsResponse,
  ForecastResultResponse,
} from '../contracts/api-contracts';
import { ForecastMetricsRequestDto, ForecastRequestDto } from './dto/forecast.dto';
import { ForecastService } from './forecast.service';

type RequestWithId = Request & { requestId?: string };

@Controller('api/v1/forecast')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Post('result')
  getForecastResult(
    @Req() request: RequestWithId,
    @Body() body: ForecastRequestDto,
  ): ForecastResultResponse {
    return this.forecastService.getForecastResult(request.requestId ?? 'unknown', body);
  }

  @Post('metrics')
  getForecastMetrics(
    @Req() request: RequestWithId,
    @Body() body: ForecastMetricsRequestDto,
  ): ForecastMetricsResponse {
    return this.forecastService.getMetrics(request.requestId ?? 'unknown', body);
  }
}

