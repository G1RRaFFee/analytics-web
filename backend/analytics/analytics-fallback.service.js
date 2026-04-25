"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsFallbackService = void 0;
const common_1 = require("@nestjs/common");
let AnalyticsFallbackService = class AnalyticsFallbackService {
    buildReport(context) {
        return {
            title: `Аналитическая справка по демографической ситуации: ${context.entity.name}`,
            executiveSummary: this.buildExecutiveSummary(context),
            demographicTrends: this.buildTrends(context),
            forecastAssessment: this.buildForecastAssessment(context),
            policyRecommendations: this.buildPolicyRecommendations(context),
            planningRecommendations: this.buildPlanningRecommendations(context),
        };
    }
    buildExecutiveSummary(context) {
        const change = context.monitoring.periodChangePercent;
        const latest = context.demography.latest;
        const forecast = context.forecast.points[context.forecast.points.length - 1];
        const changeWord = change > 0 ? 'выросла' : change < 0 ? 'сократилась' : 'осталась стабильной';
        const forecastWord = context.forecast.changePercent > 0
            ? 'ожидается дальнейший рост численности'
            : context.forecast.changePercent < 0
                ? 'ожидается сохранение нисходящего тренда'
                : 'существенных изменений по численности не ожидается';
        const parts = [
            `За период ${context.period.periodFromYear}-${context.period.periodToYear} численность населения ${context.entity.name} ${changeWord} на ${this.formatPercent(Math.abs(change))} и к ${context.period.analysisYear} году составила ${this.formatInt(context.monitoring.currentPopulation)} человек.`,
            latest.naturalGrowth !== null
                ? `Последние доступные демографические показатели указывают на ${latest.naturalGrowth >= 0 ? 'положительный' : 'отрицательный'} естественный прирост (${this.formatSigned(latest.naturalGrowth, '‰')}).`
                : 'Последние демографические коэффициенты доступны не по всем показателям, поэтому часть выводов сделана по средним значениям за анализируемый период.',
            latest.migrationRate !== null
                ? `Миграционная динамика в последнем доступном году оценивается как ${latest.migrationRate >= 0 ? 'положительная' : 'отрицательная'} (${this.formatSigned(latest.migrationRate, '‰')}).`
                : null,
            forecast
                ? `На горизонте ${context.period.horizonYears} лет ${forecastWord}; к ${forecast.year} году базовый сценарий дает оценку ${this.formatInt(forecast.population)} человек.`
                : null,
        ].filter((part) => Boolean(part));
        return parts.join(' ');
    }
    buildTrends(context) {
        const trends = [...context.demography.keySignals];
        if (context.benchmark) {
            trends.push(...context.benchmark.facts.slice(0, 2));
        }
        if (trends.length < 3) {
            trends.push(`Среднегодовое изменение численности населения за период составляет ${this.formatPercent(context.monitoring.averageAnnualChangePercent)}.`);
        }
        return this.unique(trends).slice(0, 5);
    }
    buildForecastAssessment(context) {
        const finalPoint = context.forecast.points[context.forecast.points.length - 1];
        if (!finalPoint) {
            return 'Прогнозная оценка не была сформирована из-за недостаточного объема исторических данных.';
        }
        const forecastTone = context.forecast.changePercent > 0
            ? 'умеренное увеличение'
            : context.forecast.changePercent < 0
                ? 'дальнейшее снижение'
                : 'стабилизацию';
        return [
            `Прогноз на ${context.period.horizonYears} лет, рассчитанный моделью ${context.forecast.model.name}, указывает на ${forecastTone} численности населения. К ${finalPoint.year} году ожидаемое значение составляет ${this.formatInt(finalPoint.population)} человек, что соответствует изменению на ${this.formatPercent(context.forecast.changePercent)} относительно последнего исторического наблюдения.`,
            `С учетом доверительного интервала ${Math.round(context.forecast.model.confidenceLevel * 100)}% диапазон возможных значений в конечной точке прогноза находится в пределах от ${this.formatInt(finalPoint.lower)} до ${this.formatInt(finalPoint.upper)} человек. Это означает, что при сохранении текущих факторов политика должна опираться на базовый сценарий, но учитывать потребность в адаптации к более слабой или более сильной динамике.`,
        ].join(' ');
    }
    buildPolicyRecommendations(context) {
        const recommendations = [];
        const latest = context.demography.latest;
        const recent = context.demography.recentPeriodAverage;
        if ((latest.naturalGrowth ?? recent.naturalGrowth ?? 0) < 0) {
            recommendations.push('Сфокусировать социальную политику на снижении естественной убыли: расширить меры поддержки семей с детьми, повысить доступность первичной медико-санитарной помощи и профилактических программ.');
        }
        if ((latest.migrationRate ?? recent.migrationRate ?? 0) < 0) {
            recommendations.push('Запустить адресные меры по удержанию и привлечению населения: поддержка рабочих мест, повышение доступности жилья и развитие повседневной транспортной связанности.');
        }
        if (context.monitoring.periodChangePercent > 0 || context.forecast.changePercent > 0) {
            recommendations.push('Подготовить опережающее расширение мощностей школ, детских садов, поликлиник и социальной инфраструктуры в зонах потенциального роста населения.');
        }
        else {
            recommendations.push('Провести ревизию сети социальных учреждений и перейти к более гибким форматам обслуживания там, где население сокращается или стареет.');
        }
        if (context.entity.level === 'municipality') {
            recommendations.push('Синхронизировать муниципальные меры поддержки с региональными программами занятости, здравоохранения и семейной политики для концентрации ресурсов на наиболее уязвимых группах.');
        }
        else {
            recommendations.push('Дифференцировать меры по муниципалитетам региона: усиливать поддержку территорий с устойчивой убылью и закреплять точки роста в муниципалитетах с положительной миграционной динамикой.');
        }
        recommendations.push('Регулярно обновлять мониторинг демографических коэффициентов и оценивать результативность принятых мер не реже одного раза в год.');
        return this.unique(recommendations).slice(0, 6);
    }
    buildPlanningRecommendations(context) {
        const recommendations = [];
        if (context.forecast.changePercent > 0) {
            recommendations.push('Зарезервировать территории под жилищное строительство и развитие инженерной инфраструктуры в наиболее привлекательных для проживания зонах.');
            recommendations.push('Уточнить параметры транспортной и социальной обеспеченности новых и растущих жилых массивов с учетом прогнозного увеличения нагрузки.');
        }
        else {
            recommendations.push('Скорректировать территориальное планирование под сценарий стагнации или снижения численности: ограничить избыточное расширение застройки и приоритизировать модернизацию уже освоенных территорий.');
            recommendations.push('Рассмотреть адаптивное использование объектов и площадок в территориях с устойчивым сокращением населения, чтобы снизить нагрузку на бюджет содержания инфраструктуры.');
        }
        recommendations.push('При размещении социальных объектов учитывать внутритерриториальные различия по муниципалитетам и прогнозной концентрации населения, а не только текущую численность.');
        if (context.entity.level === 'municipality') {
            recommendations.push('Увязать муниципальные решения по землепользованию, общественному транспорту и размещению услуг с ролью территории в системе расселения региона.');
        }
        else {
            recommendations.push('Использовать прогноз для уточнения схемы расселения: поддерживать опорные центры роста и усиливать межмуниципальную связанность периферийных территорий.');
        }
        return this.unique(recommendations).slice(0, 5);
    }
    unique(items) {
        return [...new Set(items.filter((item) => item.trim().length > 0))];
    }
    formatInt(value) {
        return new Intl.NumberFormat('ru-RU').format(Math.round(value));
    }
    formatPercent(value) {
        return `${value.toFixed(2)}%`;
    }
    formatSigned(value, unit = '') {
        const sign = value > 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}${unit}`;
    }
};
exports.AnalyticsFallbackService = AnalyticsFallbackService;
exports.AnalyticsFallbackService = AnalyticsFallbackService = __decorate([
    (0, common_1.Injectable)()
], AnalyticsFallbackService);
//# sourceMappingURL=analytics-fallback.service.js.map