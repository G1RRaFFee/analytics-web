import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import type {
  AnalyticsContextRequest,
  AnalyticsContextResponse,
  AnalyticsExportRequest,
  AnalyticsReportResponse,
  ConfidenceLevel,
} from '../contracts/api-contracts';
import type {
  DemographyPoint,
  PopulationPoint,
} from '../population-forecasting/src/population-forecasting/data/data.types';
import { PopulationDataService } from '../population-forecasting/src/population-forecasting/data/population-data.service';
import { DashboardService } from '../population-forecasting/src/population-forecasting/dashboard/dashboard.service';
import { ForecastService } from '../population-forecasting/src/population-forecasting/forecast/forecast.service';
import { AnalyticsExportService } from './analytics-export.service';
import { AnalyticsFallbackService } from './analytics-fallback.service';
import { AnalyticsGigachatService } from './analytics-gigachat.service';
import type {
  AnalyticsContextPayload,
  AnalyticsGenerationResult,
} from './analytics.types';

type MetricSnapshot = {
  birthRate: number | null;
  deathRate: number | null;
  migrationRate: number | null;
  naturalGrowth: number | null;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly dataService: PopulationDataService,
    private readonly dashboardService: DashboardService,
    private readonly forecastService: ForecastService,
    private readonly fallbackService: AnalyticsFallbackService,
    private readonly exportService: AnalyticsExportService,
    private readonly gigachatService: AnalyticsGigachatService,
  ) {}

  getContext(
    requestId: string,
    request: AnalyticsContextRequest,
  ): AnalyticsContextResponse {
    const context = this.buildContext(requestId, request);

    return {
      requestId,
      generatedAt: new Date().toISOString(),
      ...context,
    };
  }

  async generateReport(
    requestId: string,
    request: AnalyticsContextRequest,
  ): Promise<AnalyticsReportResponse> {
    const context = this.buildContext(requestId, request);
    const generation = await this.resolveGeneration(context);

    return {
      requestId,
      generatedAt: new Date().toISOString(),
      entity: context.entity,
      period: context.period,
      generation: {
        provider: generation.provider,
        model: generation.model,
        warning: generation.warning,
      },
      report: generation.report,
    };
  }

  async exportReport(
    requestId: string,
    request: AnalyticsExportRequest,
  ): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
    const report = await this.generateReport(requestId, request);
    return this.exportService.export(report, request.format);
  }

  private buildContext(
    requestId: string,
    request: AnalyticsContextRequest,
  ): AnalyticsContextPayload {
    this.validatePeriod(request.periodFromYear, request.periodToYear);
    this.dataService.ensureYearInRange(request.year);
    this.dataService.ensureYearInRange(request.periodFromYear);
    this.dataService.ensureYearInRange(request.periodToYear);

    const confidenceLevel = request.confidenceLevel ?? 0.95;
    const entityProfile = this.dataService.getEntityProfile(request.entityLevel, request.entityId);
    const subjectId =
      request.entityLevel === 'region' ? request.entityId : entityProfile.subjectId;

    const dashboard = this.dashboardService.getFinalData(requestId, {
      year: request.year,
      periodFromYear: request.periodFromYear,
      periodToYear: request.periodToYear,
      subjectId,
      page: 1,
      pageSize: 200,
      sortBy: 'population',
      sortOrder: 'desc',
      selectedEntity: {
        entityLevel: request.entityLevel,
        entityId: request.entityId,
      },
    });

    const selectedEntity = dashboard.selectedEntity;
    if (!selectedEntity) {
      throw new BadRequestException({
        errorCode: 'ANALYTICS_ENTITY_UNAVAILABLE',
        message: 'Selected entity details are not available for analytics context',
      });
    }

    const forecast = this.forecastService.getForecastResult(requestId, {
      entityLevel: request.entityLevel,
      entityId: request.entityId,
      horizonYears: request.horizonYears,
      confidenceLevel,
    });

    const history = selectedEntity.history;
    const historyInPeriod = history.filter(
      (point) =>
        point.year >= request.periodFromYear && point.year <= request.periodToYear,
    );
    const demographyInPeriod = selectedEntity.demography.filter(
      (point) =>
        point.year >= request.periodFromYear && point.year <= request.periodToYear,
    );

    const startPopulation =
      this.populationAtYear(history, request.periodFromYear) ?? historyInPeriod[0]?.population ?? 0;
    const endPopulation =
      this.populationAtYear(history, request.periodToYear) ??
      historyInPeriod[historyInPeriod.length - 1]?.population ??
      0;
    const currentPopulation =
      this.populationAtYear(history, request.year) ?? history[history.length - 1]?.population ?? 0;
    const periodChangePercent = this.changePercent(startPopulation, endPopulation);
    const averageAnnualChangePercent = this.averageAnnualChangePercent(
      startPopulation,
      endPopulation,
      request.periodToYear - request.periodFromYear,
    );

    const demographyPoints = demographyInPeriod.filter((point) => this.hasMetric(point));
    const latestDemography =
      this.latestDemographyPoint(demographyPoints) ??
      this.latestDemographyPoint(selectedEntity.demography) ??
      null;
    const earlyWindow = demographyPoints.slice(0, Math.min(3, demographyPoints.length));
    const recentWindow = demographyPoints.slice(Math.max(demographyPoints.length - 3, 0));
    const earlyAverage = this.averageMetrics(earlyWindow);
    const recentAverage = this.averageMetrics(recentWindow);

    const benchmark = this.buildBenchmark(
      request.entityLevel,
      request.entityId,
      entityProfile.subjectId,
      request.year,
      dashboard.table.rows as Array<Record<string, string | number | null>>,
      latestDemography ?? this.emptyMetricsWithYear(),
    );

    const latestHistoricalPopulation = history[history.length - 1]?.population ?? currentPopulation;
    const forecastFinalPoint = forecast.forecast[forecast.forecast.length - 1];
    const forecastChangePercent = forecastFinalPoint
      ? this.changePercent(latestHistoricalPopulation, forecastFinalPoint.population)
      : 0;

    const context: AnalyticsContextPayload = {
      entity: {
        id: selectedEntity.profile.entityId,
        level: selectedEntity.profile.level,
        name: selectedEntity.profile.name,
        subjectName: selectedEntity.profile.subjectName,
        municipalityType: selectedEntity.profile.municipalityType,
      },
      period: {
        analysisYear: request.year,
        periodFromYear: request.periodFromYear,
        periodToYear: request.periodToYear,
        horizonYears: request.horizonYears,
        confidenceLevel,
      },
      monitoring: {
        currentPopulation,
        startPopulation,
        endPopulation,
        periodChangePercent: this.round(periodChangePercent),
        averageAnnualChangePercent: this.round(averageAnnualChangePercent),
        trendLabel: this.classifyTrend(periodChangePercent),
        history,
      },
      demography: {
        latestYear: latestDemography?.year ?? null,
        latest: latestDemography
          ? this.metricSnapshot(latestDemography)
          : this.emptyMetrics(),
        earlyPeriodAverage: earlyAverage,
        recentPeriodAverage: recentAverage,
        keySignals: this.buildSignals({
          entityName: selectedEntity.profile.name,
          periodFromYear: request.periodFromYear,
          periodToYear: request.periodToYear,
          periodChangePercent,
          trendLabel: this.classifyTrend(periodChangePercent),
          latest: latestDemography ? this.metricSnapshot(latestDemography) : this.emptyMetrics(),
          earlyAverage,
          recentAverage,
          forecastChangePercent,
          forecastFinalPointYear: forecastFinalPoint?.year,
          benchmarkFacts: benchmark?.facts ?? [],
        }),
      },
      forecast: {
        model: {
          name: forecast.model.name,
          trainedFromYear: forecast.model.trainedFromYear,
          trainedToYear: forecast.model.trainedToYear,
          confidenceLevel: forecast.model.confidenceLevel,
        },
        changePercent: this.round(forecastChangePercent),
        points: forecast.forecast,
      },
      benchmark,
      peerHighlights: {
        growthLeaders: dashboard.tops.growth.slice(0, 5),
        declineLeaders: dashboard.tops.decline.slice(0, 5),
      },
    };

    return context;
  }

  private async resolveGeneration(
    context: AnalyticsContextPayload,
  ): Promise<AnalyticsGenerationResult> {
    if (!this.gigachatService.isEnabled()) {
      return {
        provider: 'fallback',
        model: null,
        warning:
          'GigaChat не настроен или временно отключен, поэтому использован встроенный шаблон аналитики.',
        report: this.fallbackService.buildReport(context),
      };
    }

    try {
      return await this.gigachatService.generateReport(context);
    } catch (error) {
      return {
        provider: 'fallback',
        model: null,
        warning:
          error instanceof Error
            ? `Не удалось получить ответ GigaChat: ${error.message}. Использован встроенный шаблон аналитики.`
            : 'Не удалось получить ответ GigaChat. Использован встроенный шаблон аналитики.',
        report: this.fallbackService.buildReport(context),
      };
    }
  }

  private buildBenchmark(
    entityLevel: 'region' | 'municipality',
    entityId: string,
    subjectId: string | undefined,
    analysisYear: number,
    peerRows: Array<Record<string, string | number | null>>,
    latestMetrics: DemographyPoint,
  ): AnalyticsContextPayload['benchmark'] {
    if (entityLevel === 'region' || !subjectId) {
      return {
        title: 'Внутритерриториальные ориентиры',
        facts: [
          peerRows.length > 0
            ? `В контуре анализа доступно ${peerRows.length} муниципальных образований, что позволяет оценивать неоднородность демографической ситуации внутри территории.`
            : 'В контуре анализа отсутствуют дополнительные муниципальные ориентиры для сравнения.',
        ],
      };
    }

    const regionProfile = this.dataService.getEntityProfile('region', subjectId);
    const regionHistory = this.dataService.getEntityPopulationSeries('region', subjectId);
    const regionDemography = this.dataService.getEntityDemographySeries('region', subjectId);
    const regionPopulation =
      this.populationAtYear(regionHistory, analysisYear) ??
      regionHistory[regionHistory.length - 1]?.population ??
      0;
    const regionLatest =
      this.latestDemographyPoint(regionDemography) ?? this.emptyMetricsWithYear();

    const populationRank = this.rankByNumeric(peerRows, entityId, 'entityId', 'population', 'desc');
    const changeRank = this.rankByNumeric(
      peerRows,
      entityId,
      'entityId',
      'changePercent',
      'desc',
    );

    const facts: string[] = [];
    if (regionPopulation > 0) {
      const entityPopulation =
        typeof peerRows.find((row) => row.entityId === entityId)?.population === 'number'
          ? Number(peerRows.find((row) => row.entityId === entityId)?.population)
          : 0;
      facts.push(
        `Доля территории в численности населения региона ${regionProfile.name} составляет около ${this.round((entityPopulation / regionPopulation) * 100)}%.`,
      );
    }

    if (populationRank !== null) {
      facts.push(
        `По численности населения территория занимает ${populationRank}-е место среди муниципалитетов своего региона.`,
      );
    }

    if (changeRank !== null) {
      facts.push(
        `По темпу изменения численности населения за анализируемый период территория занимает ${changeRank}-е место среди муниципалитетов региона.`,
      );
    }

    if (
      latestMetrics.birthRate !== null &&
      regionLatest.birthRate !== null &&
      Math.abs(latestMetrics.birthRate - regionLatest.birthRate) >= 0.5
    ) {
      facts.push(
        `Текущий коэффициент рождаемости ${latestMetrics.birthRate > regionLatest.birthRate ? 'выше' : 'ниже'} среднерегионального уровня примерно на ${this.round(Math.abs(latestMetrics.birthRate - regionLatest.birthRate))}‰.`,
      );
    }

    if (
      latestMetrics.migrationRate !== null &&
      regionLatest.migrationRate !== null &&
      Math.abs(latestMetrics.migrationRate - regionLatest.migrationRate) >= 0.5
    ) {
      facts.push(
        `Миграционный баланс территории ${latestMetrics.migrationRate > regionLatest.migrationRate ? 'выглядит устойчивее' : 'слабее'}, чем в среднем по региону, с отклонением около ${this.round(Math.abs(latestMetrics.migrationRate - regionLatest.migrationRate))}‰.`,
      );
    }

    return {
      title: `Сравнение с регионом ${regionProfile.name}`,
      facts,
    };
  }

  private buildSignals(input: {
    entityName: string;
    periodFromYear: number;
    periodToYear: number;
    periodChangePercent: number;
    trendLabel: string;
    latest: MetricSnapshot;
    earlyAverage: MetricSnapshot;
    recentAverage: MetricSnapshot;
    forecastChangePercent: number;
    forecastFinalPointYear?: number;
    benchmarkFacts: string[];
  }): string[] {
    const signals = [
      `За период ${input.periodFromYear}-${input.periodToYear} численность населения ${input.entityName} ${input.trendLabel.toLowerCase()} (${this.formatSignedPercent(input.periodChangePercent)}).`,
    ];

    const natural = input.latest.naturalGrowth ?? input.recentAverage.naturalGrowth;
    if (natural !== null) {
      signals.push(
        `Естественное движение населения характеризуется ${natural >= 0 ? 'положительным' : 'отрицательным'} балансом (${this.formatSigned(natural, '‰')}).`,
      );
    }

    const migration = input.latest.migrationRate ?? input.recentAverage.migrationRate;
    if (migration !== null) {
      signals.push(
        `Миграционная компонента ${migration >= 0 ? 'поддерживает' : 'сдерживает'} демографическую динамику (${this.formatSigned(migration, '‰')}).`,
      );
    }

    if (
      input.earlyAverage.birthRate !== null &&
      input.recentAverage.birthRate !== null &&
      Math.abs(input.recentAverage.birthRate - input.earlyAverage.birthRate) >= 0.3
    ) {
      signals.push(
        `По сравнению с началом периода коэффициент рождаемости ${input.recentAverage.birthRate > input.earlyAverage.birthRate ? 'повысился' : 'снизился'} примерно на ${this.round(Math.abs(input.recentAverage.birthRate - input.earlyAverage.birthRate))}‰.`,
      );
    }

    if (input.forecastFinalPointYear !== undefined) {
      signals.push(
        `Прогноз до ${input.forecastFinalPointYear} года предполагает ${input.forecastChangePercent >= 0 ? 'рост' : 'снижение'} численности населения на ${this.formatSignedPercent(input.forecastChangePercent)} относительно последнего исторического наблюдения.`,
      );
    }

    signals.push(...input.benchmarkFacts.slice(0, 2));
    return [...new Set(signals)].slice(0, 6);
  }

  private latestDemographyPoint(points: DemographyPoint[]): DemographyPoint | null {
    const filtered = points.filter((point) => this.hasMetric(point));
    if (filtered.length === 0) {
      return null;
    }
    return filtered[filtered.length - 1];
  }

  private hasMetric(point: DemographyPoint): boolean {
    return (
      point.birthRate !== null ||
      point.deathRate !== null ||
      point.migrationRate !== null ||
      point.naturalGrowth !== null
    );
  }

  private averageMetrics(points: DemographyPoint[]): MetricSnapshot {
    return {
      birthRate: this.averageNullable(points.map((point) => point.birthRate)),
      deathRate: this.averageNullable(points.map((point) => point.deathRate)),
      migrationRate: this.averageNullable(points.map((point) => point.migrationRate)),
      naturalGrowth: this.averageNullable(points.map((point) => point.naturalGrowth)),
    };
  }

  private metricSnapshot(point: DemographyPoint): MetricSnapshot {
    return {
      birthRate: point.birthRate,
      deathRate: point.deathRate,
      migrationRate: point.migrationRate,
      naturalGrowth: point.naturalGrowth,
    };
  }

  private emptyMetrics(): MetricSnapshot {
    return {
      birthRate: null,
      deathRate: null,
      migrationRate: null,
      naturalGrowth: null,
    };
  }

  private emptyMetricsWithYear(): DemographyPoint {
    return {
      year: 0,
      ...this.emptyMetrics(),
    };
  }

  private populationAtYear(points: PopulationPoint[], year: number): number | null {
    const found = points.find((point) => point.year === year);
    return found ? found.population : null;
  }

  private rankByNumeric(
    rows: Array<Record<string, string | number | null>>,
    entityId: string,
    idField: string,
    metricField: string,
    direction: 'asc' | 'desc',
  ): number | null {
    const sorted = [...rows]
      .filter((row) => typeof row[metricField] === 'number')
      .sort((left, right) => {
        const a = Number(left[metricField]);
        const b = Number(right[metricField]);
        return direction === 'asc' ? a - b : b - a;
      });

    const index = sorted.findIndex((row) => row[idField] === entityId);
    return index === -1 ? null : index + 1;
  }

  private classifyTrend(changePercent: number): string {
    if (changePercent >= 3) {
      return 'Рост населения';
    }
    if (changePercent <= -3) {
      return 'Снижение населения';
    }
    return 'Относительная стабилизация населения';
  }

  private changePercent(from: number, to: number): number {
    if (!Number.isFinite(from) || from === 0) {
      return 0;
    }
    return ((to - from) / from) * 100;
  }

  private averageAnnualChangePercent(from: number, to: number, periods: number): number {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || periods <= 0) {
      return 0;
    }
    return (Math.pow(to / from, 1 / periods) - 1) * 100;
  }

  private averageNullable(values: Array<number | null>): number | null {
    const valid = values.filter((value): value is number => value !== null);
    if (valid.length === 0) {
      return null;
    }
    return this.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
  }

  private validatePeriod(fromYear: number, toYear: number): void {
    if (fromYear > toYear) {
      throw new BadRequestException({
        errorCode: 'INVALID_PERIOD',
        message: 'periodFromYear must be less than or equal to periodToYear',
      });
    }
  }

  private formatSignedPercent(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${this.round(value)}%`;
  }

  private formatSigned(value: number, unit = ''): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${this.round(value)}${unit}`;
  }

  private round(value: number, digits = 2): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }
}
