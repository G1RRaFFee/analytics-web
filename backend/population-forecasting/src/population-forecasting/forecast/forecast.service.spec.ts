import { expect, describe, it, beforeEach } from '@jest/globals';

import { ForecastService } from './forecast.service';

class PopulationDataServiceMock {
  private readonly series: Record<string, Array<{ year: number; population: number }>> = {
    'region-up': [
      { year: 2010, population: 100 },
      { year: 2011, population: 120 },
      { year: 2012, population: 140 },
      { year: 2013, population: 160 },
      { year: 2014, population: 180 },
      { year: 2015, population: 200 },
      { year: 2016, population: 220 },
    ],
    'region-down': [
      { year: 2010, population: 220 },
      { year: 2011, population: 200 },
      { year: 2012, population: 180 },
      { year: 2013, population: 160 },
      { year: 2014, population: 140 },
      { year: 2015, population: 120 },
      { year: 2016, population: 100 },
    ],
    'region-zero': [
      { year: 2010, population: 100 },
      { year: 2011, population: 120 },
      { year: 2012, population: 0 },
      { year: 2013, population: 130 },
      { year: 2014, population: 140 },
      { year: 2015, population: 150 },
      { year: 2016, population: 160 },
    ],
  };

  getEntityProfile(_: string, entityId: string) {
    return { id: entityId, level: 'region', name: entityId };
  }

  getEntityPopulationSeries(_: string, entityId: string) {
    return this.series[entityId];
  }
}

describe('ForecastService', () => {
  let service: ForecastService;

  beforeEach(() => {
    service = new ForecastService(new PopulationDataServiceMock() as never);
  });

  it('builds forecast for horizon 5 and keeps confidence interval bounds', () => {
    const result = service.getForecastResult('r-1', {
      entityLevel: 'region',
      entityId: 'region-up',
      horizonYears: 5,
      confidenceLevel: 0.95,
    });

    expect(result.forecast).toHaveLength(5);
    result.forecast.forEach((point) => {
      expect(point.lower).toBeLessThanOrEqual(point.population);
      expect(point.population).toBeLessThanOrEqual(point.upper);
    });
  });

  it('supports horizon 15 boundary', () => {
    const result = service.getForecastResult('r-2', {
      entityLevel: 'region',
      entityId: 'region-down',
      horizonYears: 15,
      confidenceLevel: 0.9,
    });

    expect(result.forecast).toHaveLength(15);
  });

  it('calculates rolling backtest metrics including zero-actual handling in MAPE', () => {
    const result = service.getMetrics('r-3', {
      entityLevel: 'region',
      entityId: 'region-zero',
      horizonYears: 5,
      backtestWindowYears: 5,
    });

    expect(result.metrics.mape).toBeGreaterThanOrEqual(0);
    expect(result.metrics.rmse).toBeGreaterThanOrEqual(0);
    expect(result.metrics.mae).toBeGreaterThanOrEqual(0);
    expect(result.metrics.excludedZeroActuals).toBeGreaterThan(0);
  });
});
