import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  ConfidenceLevel,
  ForecastMetricsRequest,
  ForecastMetricsResponse,
  ForecastRequest,
  ForecastResultResponse,
} from '../contracts/api-contracts';
import { PopulationDataService } from '../data/population-data.service';

interface HoltModel {
  alpha: number;
  beta: number;
  level: number;
  trend: number;
  residuals: number[];
}

@Injectable()
export class ForecastService {
  constructor(private readonly dataService: PopulationDataService) {}

  getForecastResult(requestId: string, request: ForecastRequest): ForecastResultResponse {
    this.validateHistoryRange(request.historyFromYear, request.historyToYear);

    const confidenceLevel = request.confidenceLevel ?? 0.95;
    const entity = this.dataService.getEntityProfile(request.entityLevel, request.entityId);
    const history = this.dataService.getEntityPopulationSeries(
      request.entityLevel,
      request.entityId,
      request.historyFromYear,
      request.historyToYear,
    );

    if (history.length < 3) {
      throw new BadRequestException({
        errorCode: 'INSUFFICIENT_HISTORY',
        message: 'At least 3 historical points are required for forecasting',
      });
    }

    const values = history.map((point) => point.population);
    const model = this.fitHolt(values);
    const sigma = this.standardDeviation(model.residuals);
    const zScore = this.zScore(confidenceLevel);
    const lastYear = history[history.length - 1].year;

    const forecast = Array.from({ length: request.horizonYears }, (_, index) => {
      const step = index + 1;
      const prediction = model.level + model.trend * step;
      const margin = zScore * sigma * Math.sqrt(step);
      return {
        year: lastYear + step,
        population: Math.max(0, Math.round(prediction)),
        lower: Math.max(0, Math.round(prediction - margin)),
        upper: Math.max(0, Math.round(prediction + margin)),
      };
    });

    return {
      requestId,
      entity: {
        id: entity.id,
        level: entity.level,
        name: entity.name,
        subjectId: entity.subjectId,
      },
      history: history.map((point) => ({
        year: point.year,
        population: point.population,
      })),
      forecast,
      model: {
        name: 'holt-linear',
        trainedFromYear: history[0].year,
        trainedToYear: history[history.length - 1].year,
        confidenceLevel,
      },
    };
  }

  getMetrics(requestId: string, request: ForecastMetricsRequest): ForecastMetricsResponse {
    this.validateHistoryRange(request.historyFromYear, request.historyToYear);
    const entity = this.dataService.getEntityProfile(request.entityLevel, request.entityId);
    const history = this.dataService.getEntityPopulationSeries(
      request.entityLevel,
      request.entityId,
      request.historyFromYear,
      request.historyToYear,
    );
    if (history.length < 6) {
      throw new BadRequestException({
        errorCode: 'INSUFFICIENT_HISTORY',
        message: 'At least 6 points are required for rolling backtest metrics',
      });
    }

    const values = history.map((point) => point.population);
    const requestedWindow = request.backtestWindowYears ?? 5;
    const backtestWindowYears = Math.min(requestedWindow, values.length - 2);
    const startIndex = values.length - backtestWindowYears;

    let sumAbs = 0;
    let sumSquared = 0;
    let sumMpe = 0;
    let mapePoints = 0;
    let excludedZeroActuals = 0;
    let points = 0;

    for (let index = startIndex; index < values.length; index += 1) {
      const train = values.slice(0, index);
      const actual = values[index];
      const model = this.fitHolt(train);
      const prediction = model.level + model.trend;
      const error = actual - prediction;

      points += 1;
      sumAbs += Math.abs(error);
      sumSquared += error ** 2;

      if (actual === 0) {
        excludedZeroActuals += 1;
      } else {
        sumMpe += Math.abs(error / actual) * 100;
        mapePoints += 1;
      }
    }

    return {
      requestId,
      entity: {
        id: entity.id,
        level: entity.level,
        name: entity.name,
      },
      metrics: {
        mape: this.round(mapePoints > 0 ? sumMpe / mapePoints : 0, 4),
        rmse: this.round(Math.sqrt(sumSquared / points), 4),
        mae: this.round(sumAbs / points, 4),
        points,
        excludedZeroActuals,
      },
      validation: {
        method: 'rolling-origin',
        backtestWindowYears,
      },
    };
  }

  private fitHolt(values: number[]): HoltModel {
    if (values.length < 2) {
      throw new BadRequestException({
        errorCode: 'INSUFFICIENT_HISTORY',
        message: 'At least 2 points are required for model fitting',
      });
    }

    let best: HoltModel | null = null;
    let bestSse = Number.POSITIVE_INFINITY;

    for (let alpha = 0.1; alpha <= 0.9; alpha += 0.1) {
      for (let beta = 0.1; beta <= 0.9; beta += 0.1) {
        const candidate = this.runHolt(values, this.round(alpha, 1), this.round(beta, 1));
        const sse = candidate.residuals.reduce((sum, err) => sum + err ** 2, 0);
        if (sse < bestSse) {
          best = candidate;
          bestSse = sse;
        }
      }
    }

    if (!best) {
      return this.runHolt(values, 0.5, 0.3);
    }
    return best;
  }

  private runHolt(values: number[], alpha: number, beta: number): HoltModel {
    let level = values[0];
    let trend = values[1] - values[0];
    const residuals: number[] = [];

    for (let index = 1; index < values.length; index += 1) {
      const forecast = level + trend;
      const actual = values[index];
      const error = actual - forecast;
      residuals.push(error);

      const nextLevel = alpha * actual + (1 - alpha) * (level + trend);
      const nextTrend = beta * (nextLevel - level) + (1 - beta) * trend;
      level = nextLevel;
      trend = nextTrend;
    }

    return { alpha, beta, level, trend, residuals };
  }

  private standardDeviation(values: number[]): number {
    if (values.length <= 1) {
      return 1;
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(Math.max(variance, 1));
  }

  private zScore(confidenceLevel: ConfidenceLevel): number {
    if (confidenceLevel === 0.8) {
      return 1.2816;
    }
    if (confidenceLevel === 0.9) {
      return 1.6449;
    }
    return 1.96;
  }

  private validateHistoryRange(fromYear?: number, toYear?: number): void {
    if (fromYear !== undefined && toYear !== undefined && fromYear > toYear) {
      throw new BadRequestException({
        errorCode: 'INVALID_YEAR_RANGE',
        message: 'historyFromYear must be less than or equal to historyToYear',
      });
    }
  }

  private round(value: number, digits = 2): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }
}

