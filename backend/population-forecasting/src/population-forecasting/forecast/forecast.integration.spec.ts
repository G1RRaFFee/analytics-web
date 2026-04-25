import { PopulationDataService } from '../data/population-data.service';
import { ForecastService } from './forecast.service';

describe('ForecastService integration (demography.csv)', () => {
  let dataService: PopulationDataService;
  let forecastService: ForecastService;

  beforeAll(() => {
    dataService = new PopulationDataService();
    forecastService = new ForecastService(dataService);
  });

  it('trains Holt model and returns forecast interval for a real municipality series', () => {
    const candidate = dataService
      .getMunicipalities()
      .find(
        (municipality) =>
          dataService.getEntityPopulationSeries('municipality', municipality.id).length >= 8,
      );

    expect(candidate).toBeDefined();
    if (!candidate) {
      return;
    }

    const result = forecastService.getForecastResult('integration-forecast', {
      entityLevel: 'municipality',
      entityId: candidate.id,
      horizonYears: 5,
      confidenceLevel: 0.95,
    });

    expect(result.history.length).toBeGreaterThanOrEqual(8);
    expect(result.forecast).toHaveLength(5);
    result.forecast.forEach((point) => {
      expect(point.lower).toBeLessThanOrEqual(point.population);
      expect(point.population).toBeLessThanOrEqual(point.upper);
    });
  });

  it('calculates MAPE, RMSE and MAE on rolling validation for real data', () => {
    const candidate = dataService
      .getAllRegions()
      .find((region) => dataService.getEntityPopulationSeries('region', region.id).length >= 10);

    expect(candidate).toBeDefined();
    if (!candidate) {
      return;
    }

    const metrics = forecastService.getMetrics('integration-metrics', {
      entityLevel: 'region',
      entityId: candidate.id,
      horizonYears: 5,
      backtestWindowYears: 5,
    });

    expect(metrics.metrics.points).toBeGreaterThan(0);
    expect(metrics.metrics.mape).toBeGreaterThanOrEqual(0);
    expect(metrics.metrics.rmse).toBeGreaterThanOrEqual(0);
    expect(metrics.metrics.mae).toBeGreaterThanOrEqual(0);
  });
});
