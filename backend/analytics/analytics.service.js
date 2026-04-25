"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const population_data_service_1 = require("../population-forecasting/src/population-forecasting/data/population-data.service");
const dashboard_service_1 = require("../population-forecasting/src/population-forecasting/dashboard/dashboard.service");
const forecast_service_1 = require("../population-forecasting/src/population-forecasting/forecast/forecast.service");
const analytics_export_service_1 = require("./analytics-export.service");
const analytics_fallback_service_1 = require("./analytics-fallback.service");
const analytics_gigachat_service_1 = require("./analytics-gigachat.service");
let AnalyticsService = class AnalyticsService {
    dataService;
    dashboardService;
    forecastService;
    fallbackService;
    exportService;
    gigachatService;
    constructor(dataService, dashboardService, forecastService, fallbackService, exportService, gigachatService) {
        this.dataService = dataService;
        this.dashboardService = dashboardService;
        this.forecastService = forecastService;
        this.fallbackService = fallbackService;
        this.exportService = exportService;
        this.gigachatService = gigachatService;
    }
    getContext(requestId, request) {
        const context = this.buildContext(requestId, request);
        return {
            requestId,
            generatedAt: new Date().toISOString(),
            ...context,
        };
    }
    async generateReport(requestId, request) {
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
    async exportReport(requestId, request) {
        const report = await this.generateReport(requestId, request);
        return this.exportService.export(report, request.format);
    }
    buildContext(requestId, request) {
        this.validatePeriod(request.periodFromYear, request.periodToYear);
        this.dataService.ensureYearInRange(request.year);
        this.dataService.ensureYearInRange(request.periodFromYear);
        this.dataService.ensureYearInRange(request.periodToYear);
        const confidenceLevel = request.confidenceLevel ?? 0.95;
        const entityProfile = this.dataService.getEntityProfile(request.entityLevel, request.entityId);
        const subjectId = request.entityLevel === 'region' ? request.entityId : entityProfile.subjectId;
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
            throw new common_1.BadRequestException({
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
        const historyInPeriod = history.filter((point) => point.year >= request.periodFromYear && point.year <= request.periodToYear);
        const demographyInPeriod = selectedEntity.demography.filter((point) => point.year >= request.periodFromYear && point.year <= request.periodToYear);
        const startPopulation = this.populationAtYear(history, request.periodFromYear) ?? historyInPeriod[0]?.population ?? 0;
        const endPopulation = this.populationAtYear(history, request.periodToYear) ??
            historyInPeriod[historyInPeriod.length - 1]?.population ??
            0;
        const currentPopulation = this.populationAtYear(history, request.year) ?? history[history.length - 1]?.population ?? 0;
        const periodChangePercent = this.changePercent(startPopulation, endPopulation);
        const averageAnnualChangePercent = this.averageAnnualChangePercent(startPopulation, endPopulation, request.periodToYear - request.periodFromYear);
        const demographyPoints = demographyInPeriod.filter((point) => this.hasMetric(point));
        const latestDemography = this.latestDemographyPoint(demographyPoints) ??
            this.latestDemographyPoint(selectedEntity.demography) ??
            null;
        const earlyWindow = demographyPoints.slice(0, Math.min(3, demographyPoints.length));
        const recentWindow = demographyPoints.slice(Math.max(demographyPoints.length - 3, 0));
        const earlyAverage = this.averageMetrics(earlyWindow);
        const recentAverage = this.averageMetrics(recentWindow);
        const benchmark = this.buildBenchmark(request.entityLevel, request.entityId, entityProfile.subjectId, request.year, dashboard.table.rows, latestDemography ?? this.emptyMetricsWithYear());
        const latestHistoricalPopulation = history[history.length - 1]?.population ?? currentPopulation;
        const forecastFinalPoint = forecast.forecast[forecast.forecast.length - 1];
        const forecastChangePercent = forecastFinalPoint
            ? this.changePercent(latestHistoricalPopulation, forecastFinalPoint.population)
            : 0;
        const context = {
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
    async resolveGeneration(context) {
        if (!this.gigachatService.isEnabled()) {
            return {
                provider: 'fallback',
                model: null,
                warning: 'GigaChat не настроен или временно отключен, поэтому использован встроенный шаблон аналитики.',
                report: this.fallbackService.buildReport(context),
            };
        }
        try {
            return await this.gigachatService.generateReport(context);
        }
        catch (error) {
            return {
                provider: 'fallback',
                model: null,
                warning: error instanceof Error
                    ? `Не удалось получить ответ GigaChat: ${error.message}. Использован встроенный шаблон аналитики.`
                    : 'Не удалось получить ответ GigaChat. Использован встроенный шаблон аналитики.',
                report: this.fallbackService.buildReport(context),
            };
        }
    }
    buildBenchmark(entityLevel, entityId, subjectId, analysisYear, peerRows, latestMetrics) {
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
        const regionPopulation = this.populationAtYear(regionHistory, analysisYear) ??
            regionHistory[regionHistory.length - 1]?.population ??
            0;
        const regionLatest = this.latestDemographyPoint(regionDemography) ?? this.emptyMetricsWithYear();
        const populationRank = this.rankByNumeric(peerRows, entityId, 'entityId', 'population', 'desc');
        const changeRank = this.rankByNumeric(peerRows, entityId, 'entityId', 'changePercent', 'desc');
        const facts = [];
        if (regionPopulation > 0) {
            const entityPopulation = typeof peerRows.find((row) => row.entityId === entityId)?.population === 'number'
                ? Number(peerRows.find((row) => row.entityId === entityId)?.population)
                : 0;
            facts.push(`Доля территории в численности населения региона ${regionProfile.name} составляет около ${this.round((entityPopulation / regionPopulation) * 100)}%.`);
        }
        if (populationRank !== null) {
            facts.push(`По численности населения территория занимает ${populationRank}-е место среди муниципалитетов своего региона.`);
        }
        if (changeRank !== null) {
            facts.push(`По темпу изменения численности населения за анализируемый период территория занимает ${changeRank}-е место среди муниципалитетов региона.`);
        }
        if (latestMetrics.birthRate !== null &&
            regionLatest.birthRate !== null &&
            Math.abs(latestMetrics.birthRate - regionLatest.birthRate) >= 0.5) {
            facts.push(`Текущий коэффициент рождаемости ${latestMetrics.birthRate > regionLatest.birthRate ? 'выше' : 'ниже'} среднерегионального уровня примерно на ${this.round(Math.abs(latestMetrics.birthRate - regionLatest.birthRate))}‰.`);
        }
        if (latestMetrics.migrationRate !== null &&
            regionLatest.migrationRate !== null &&
            Math.abs(latestMetrics.migrationRate - regionLatest.migrationRate) >= 0.5) {
            facts.push(`Миграционный баланс территории ${latestMetrics.migrationRate > regionLatest.migrationRate ? 'выглядит устойчивее' : 'слабее'}, чем в среднем по региону, с отклонением около ${this.round(Math.abs(latestMetrics.migrationRate - regionLatest.migrationRate))}‰.`);
        }
        return {
            title: `Сравнение с регионом ${regionProfile.name}`,
            facts,
        };
    }
    buildSignals(input) {
        const signals = [
            `За период ${input.periodFromYear}-${input.periodToYear} численность населения ${input.entityName} ${input.trendLabel.toLowerCase()} (${this.formatSignedPercent(input.periodChangePercent)}).`,
        ];
        const natural = input.latest.naturalGrowth ?? input.recentAverage.naturalGrowth;
        if (natural !== null) {
            signals.push(`Естественное движение населения характеризуется ${natural >= 0 ? 'положительным' : 'отрицательным'} балансом (${this.formatSigned(natural, '‰')}).`);
        }
        const migration = input.latest.migrationRate ?? input.recentAverage.migrationRate;
        if (migration !== null) {
            signals.push(`Миграционная компонента ${migration >= 0 ? 'поддерживает' : 'сдерживает'} демографическую динамику (${this.formatSigned(migration, '‰')}).`);
        }
        if (input.earlyAverage.birthRate !== null &&
            input.recentAverage.birthRate !== null &&
            Math.abs(input.recentAverage.birthRate - input.earlyAverage.birthRate) >= 0.3) {
            signals.push(`По сравнению с началом периода коэффициент рождаемости ${input.recentAverage.birthRate > input.earlyAverage.birthRate ? 'повысился' : 'снизился'} примерно на ${this.round(Math.abs(input.recentAverage.birthRate - input.earlyAverage.birthRate))}‰.`);
        }
        if (input.forecastFinalPointYear !== undefined) {
            signals.push(`Прогноз до ${input.forecastFinalPointYear} года предполагает ${input.forecastChangePercent >= 0 ? 'рост' : 'снижение'} численности населения на ${this.formatSignedPercent(input.forecastChangePercent)} относительно последнего исторического наблюдения.`);
        }
        signals.push(...input.benchmarkFacts.slice(0, 2));
        return [...new Set(signals)].slice(0, 6);
    }
    latestDemographyPoint(points) {
        const filtered = points.filter((point) => this.hasMetric(point));
        if (filtered.length === 0) {
            return null;
        }
        return filtered[filtered.length - 1];
    }
    hasMetric(point) {
        return (point.birthRate !== null ||
            point.deathRate !== null ||
            point.migrationRate !== null ||
            point.naturalGrowth !== null);
    }
    averageMetrics(points) {
        return {
            birthRate: this.averageNullable(points.map((point) => point.birthRate)),
            deathRate: this.averageNullable(points.map((point) => point.deathRate)),
            migrationRate: this.averageNullable(points.map((point) => point.migrationRate)),
            naturalGrowth: this.averageNullable(points.map((point) => point.naturalGrowth)),
        };
    }
    metricSnapshot(point) {
        return {
            birthRate: point.birthRate,
            deathRate: point.deathRate,
            migrationRate: point.migrationRate,
            naturalGrowth: point.naturalGrowth,
        };
    }
    emptyMetrics() {
        return {
            birthRate: null,
            deathRate: null,
            migrationRate: null,
            naturalGrowth: null,
        };
    }
    emptyMetricsWithYear() {
        return {
            year: 0,
            ...this.emptyMetrics(),
        };
    }
    populationAtYear(points, year) {
        const found = points.find((point) => point.year === year);
        return found ? found.population : null;
    }
    rankByNumeric(rows, entityId, idField, metricField, direction) {
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
    classifyTrend(changePercent) {
        if (changePercent >= 3) {
            return 'Рост населения';
        }
        if (changePercent <= -3) {
            return 'Снижение населения';
        }
        return 'Относительная стабилизация населения';
    }
    changePercent(from, to) {
        if (!Number.isFinite(from) || from === 0) {
            return 0;
        }
        return ((to - from) / from) * 100;
    }
    averageAnnualChangePercent(from, to, periods) {
        if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || periods <= 0) {
            return 0;
        }
        return (Math.pow(to / from, 1 / periods) - 1) * 100;
    }
    averageNullable(values) {
        const valid = values.filter((value) => value !== null);
        if (valid.length === 0) {
            return null;
        }
        return this.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
    }
    validatePeriod(fromYear, toYear) {
        if (fromYear > toYear) {
            throw new common_1.BadRequestException({
                errorCode: 'INVALID_PERIOD',
                message: 'periodFromYear must be less than or equal to periodToYear',
            });
        }
    }
    formatSignedPercent(value) {
        const sign = value > 0 ? '+' : '';
        return `${sign}${this.round(value)}%`;
    }
    formatSigned(value, unit = '') {
        const sign = value > 0 ? '+' : '';
        return `${sign}${this.round(value)}${unit}`;
    }
    round(value, digits = 2) {
        const factor = 10 ** digits;
        return Math.round(value * factor) / factor;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [population_data_service_1.PopulationDataService,
        dashboard_service_1.DashboardService,
        forecast_service_1.ForecastService,
        analytics_fallback_service_1.AnalyticsFallbackService,
        analytics_export_service_1.AnalyticsExportService,
        analytics_gigachat_service_1.AnalyticsGigachatService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map