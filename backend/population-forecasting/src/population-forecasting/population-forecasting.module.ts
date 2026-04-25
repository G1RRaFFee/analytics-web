import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { PopulationDataService } from './data/population-data.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { ForecastController } from './forecast/forecast.controller';
import { ForecastService } from './forecast/forecast.service';

@Module({
  controllers: [ForecastController, DashboardController],
  providers: [PopulationDataService, ForecastService, DashboardService],
  exports: [PopulationDataService, ForecastService, DashboardService],
})
export class PopulationForecastingModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
