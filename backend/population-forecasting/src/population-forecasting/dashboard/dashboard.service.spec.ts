import { expect, describe, it, beforeEach } from '@jest/globals';

import { DashboardService } from './dashboard.service';

class DataServiceMock {
  private readonly regions = [
    {
      id: 'region-1',
      name: 'Region A',
      populationByYear: { 2020: 1000, 2021: 1100, 2022: 1150, 2023: 1200 },
      demographyByYear: {
        2023: { birthRate: 10, deathRate: 12, migrationRate: 3, naturalGrowth: -2 },
      },
    },
    {
      id: 'region-2',
      name: 'Region B',
      populationByYear: { 2020: 900, 2021: 850, 2022: 820, 2023: 800 },
      demographyByYear: {
        2023: { birthRate: 9, deathRate: 13, migrationRate: 1, naturalGrowth: -4 },
      },
    },
  ];

  private readonly municipalities = [
    {
      id: 'region-1-mo-1',
      regionId: 'region-1',
      regionName: 'Region A',
      name: 'City A1',
      municipalityType: 'urban_okrug',
      populationByYear: { 2020: 500, 2023: 650 },
      demographyByYear: {
        2023: { birthRate: 10, deathRate: 11, migrationRate: 5, naturalGrowth: -1 },
      },
    },
    {
      id: 'region-1-mo-2',
      regionId: 'region-1',
      regionName: 'Region A',
      name: 'District A2',
      municipalityType: 'municipal_raion',
      populationByYear: { 2020: 450, 2023: 430 },
      demographyByYear: {
        2023: { birthRate: 8, deathRate: 14, migrationRate: -2, naturalGrowth: -6 },
      },
    },
    {
      id: 'region-2-mo-1',
      regionId: 'region-2',
      regionName: 'Region B',
      name: 'City B1',
      municipalityType: 'urban_okrug',
      populationByYear: { 2020: 400, 2023: 350 },
      demographyByYear: {
        2023: { birthRate: 9, deathRate: 15, migrationRate: -3, naturalGrowth: -6 },
      },
    },
  ];

  ensureYearInRange(): void {
    return;
  }

  getAllRegions() {
    return this.regions as never;
  }

  getMunicipalities(filters?: { subjectId?: string; municipalityType?: string; search?: string }) {
    return this.municipalities.filter((item) => {
      if (filters?.subjectId && item.regionId !== filters.subjectId) {
        return false;
      }
      if (filters?.municipalityType && item.municipalityType !== filters.municipalityType) {
        return false;
      }
      if (filters?.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      return true;
    }) as never;
  }

  getDemographyAtYear(source: Record<number, unknown>, year: number) {
    return (
      source[year] ?? {
        birthRate: null,
        deathRate: null,
        migrationRate: null,
        naturalGrowth: null,
      }
    ) as never;
  }

  getEntityProfile() {
    return {
      id: 'region-1',
      level: 'region',
      name: 'Region A',
      subjectName: 'Region A',
      subjectId: 'region-1',
    };
  }

  getEntityPopulationSeries() {
    return [
      { year: 2020, population: 1000 },
      { year: 2021, population: 1100 },
      { year: 2022, population: 1150 },
      { year: 2023, population: 1200 },
    ];
  }

  getEntityDemographySeries() {
    return [
      { year: 2023, birthRate: 10, deathRate: 12, migrationRate: 3, naturalGrowth: -2 },
    ];
  }
}

class ForecastServiceMock {
  getForecastResult() {
    return {
      forecast: [
        { year: 2024, population: 1220, lower: 1190, upper: 1250 },
        { year: 2025, population: 1240, lower: 1200, upper: 1280 },
      ],
    };
  }
}

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    service = new DashboardService(
      new DataServiceMock() as never,
      new ForecastServiceMock() as never,
    );
  });

  it('filters rows by subject and municipality type', () => {
    const result = service.getFinalData('req-1', {
      year: 2023,
      periodFromYear: 2020,
      periodToYear: 2023,
      subjectId: 'region-1',
      municipalityType: 'urban_okrug',
    });

    expect(result.table.rows).toHaveLength(1);
    expect(result.table.rows[0].subjectName).toBe('Region A');
  });

  it('applies sorting and pagination for table rows', () => {
    const result = service.getFinalData('req-2', {
      year: 2023,
      periodFromYear: 2020,
      periodToYear: 2023,
      page: 1,
      pageSize: 2,
      sortBy: 'population',
      sortOrder: 'desc',
    });

    expect(result.table.rows).toHaveLength(2);
    expect((result.table.rows[0].population as number) >= (result.table.rows[1].population as number)).toBeTruthy();
  });

  it('builds top growth and top decline lists', () => {
    const result = service.getFinalData('req-3', {
      year: 2023,
      periodFromYear: 2020,
      periodToYear: 2023,
    });

    expect(result.tops.growth[0].changePercent).toBeGreaterThanOrEqual(
      result.tops.growth[result.tops.growth.length - 1].changePercent,
    );
    expect(result.tops.decline[0].changePercent).toBeLessThanOrEqual(
      result.tops.decline[result.tops.decline.length - 1].changePercent,
    );
  });
});
