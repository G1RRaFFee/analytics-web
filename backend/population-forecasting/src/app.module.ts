import { BadRequestException, Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ApiExceptionFilter } from './population-forecasting/common/api-exception.filter';
import { PopulationForecastingModule } from './population-forecasting/population-forecasting.module';

@Module({
  imports: [PopulationForecastingModule],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
          transformOptions: { enableImplicitConversion: true },
          exceptionFactory: (errors) =>
            new BadRequestException({
              errorCode: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: errors.map((err) => ({
                property: err.property,
                constraints: err.constraints,
                value: err.value,
              })),
            }),
        }),
    },
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
})
export class AppModule {}
