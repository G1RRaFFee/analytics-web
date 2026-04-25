import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsExportService } from './analytics/analytics-export.service';
import { AnalyticsFallbackService } from './analytics/analytics-fallback.service';
import { AnalyticsGigachatService } from './analytics/analytics-gigachat.service';
import { AnalyticsService } from './analytics/analytics.service';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { PopulationDataService } from './data/population-data.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { ForecastController } from './forecast/forecast.controller';
import { ForecastService } from './forecast/forecast.service';

@Module({
  controllers: [ForecastController, DashboardController, AnalyticsController],
  providers: [
    PopulationDataService,
    ForecastService,
    DashboardService,
    AnalyticsService,
    AnalyticsFallbackService,
    AnalyticsExportService,
    AnalyticsGigachatService,
  ],
  exports: [
    PopulationDataService,
    ForecastService,
    DashboardService,
    AnalyticsService,
    AnalyticsFallbackService,
    AnalyticsExportService,
    AnalyticsGigachatService,
  ],
})
export class PopulationForecastingModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
