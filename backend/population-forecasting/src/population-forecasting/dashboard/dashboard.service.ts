import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  FinalDataRequest,
  FinalDataResponse,
  SortBy,
  SortOrder,
} from '../contracts/api-contracts';
import type { DemographyPoint, MunicipalityRecord, RegionRecord } from '../data/data.types';
import { PopulationDataService } from '../data/population-data.service';
import { ForecastService } from '../forecast/forecast.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly dataService: PopulationDataService,
    private readonly forecastService: ForecastService,
  ) {}

  getFinalData(requestId: string, request: FinalDataRequest): FinalDataResponse {
    this.validatePeriod(request.periodFromYear, request.periodToYear);
    this.dataService.ensureYearInRange(request.year);
    this.dataService.ensureYearInRange(request.periodFromYear);
    this.dataService.ensureYearInRange(request.periodToYear);

    const regions = this.filterRegions(request.subjectId);
    const municipalities = this.dataService.getMunicipalities({
      subjectId: request.subjectId,
      municipalityType: request.municipalityType,
      search: request.search,
    });

    const summary = this.buildSummary(regions, request.year, request.periodFromYear, request.periodToYear);
    const heatmap = this.buildHeatmap(regions, request.year, request.periodFromYear, request.periodToYear);
    const table = this.buildTable(
      municipalities,
      request.year,
      request.periodFromYear,
      request.periodToYear,
      request.page ?? 1,
      request.pageSize ?? 25,
      request.sortBy ?? 'population',
      request.sortOrder ?? 'desc',
    );
    const tops = this.buildTops(municipalities, request.year, request.periodFromYear, request.periodToYear);
    const selectedEntity = request.selectedEntity
      ? this.buildSelectedEntity(requestId, request)
      : undefined;

    return {
      requestId,
      generatedAt: new Date().toISOString(),
      summary,
      heatmap,
      table,
      tops,
      selectedEntity,
    };
  }

  private filterRegions(subjectId?: string): RegionRecord[] {
    const regions = this.dataService.getAllRegions();
    if (!subjectId) {
      return regions;
    }
    const filtered = regions.filter((region) => region.id === subjectId);
    if (filtered.length === 0) {
      throw new NotFoundException({
        errorCode: 'ENTITY_NOT_FOUND',
        message: `Region with id "${subjectId}" not found`,
      });
    }
    return filtered;
  }

  private buildSummary(regions: RegionRecord[], year: number, fromYear: number, toYear: number) {
    const totalPopulation = this.sum(regions.map((region) => region.populationByYear[year] ?? 0));
    const totalFrom = this.sum(regions.map((region) => region.populationByYear[fromYear] ?? 0));
    const totalTo = this.sum(regions.map((region) => region.populationByYear[toYear] ?? 0));
    const periodChangePercent = this.changePercent(totalFrom, totalTo);

    const metricsByYear = regions.map((region) =>
      this.dataService.getDemographyAtYear(region.demographyByYear, year),
    );
    const avgBirthRate = this.averageNullable(metricsByYear.map((m) => m.birthRate));
    const avgDeathRate = this.averageNullable(metricsByYear.map((m) => m.deathRate));
    const avgMigrationRate = this.averageNullable(metricsByYear.map((m) => m.migrationRate));
    const avgNaturalGrowth = this.averageNullable(metricsByYear.map((m) => m.naturalGrowth));

    const growingRegionsCount = regions.filter((region) => {
      const from = region.populationByYear[fromYear];
      const to = region.populationByYear[toYear];
      if (from === undefined || to === undefined) {
        return false;
      }
      return to >= from;
    }).length;

    return {
      totalPopulation,
      periodChangePercent: this.round(periodChangePercent, 2),
      avgBirthRate: this.round(avgBirthRate, 2),
      avgDeathRate: this.round(avgDeathRate, 2),
      avgMigrationRate: this.round(avgMigrationRate, 2),
      avgNaturalGrowth: this.round(avgNaturalGrowth, 2),
      growingRegionsCount,
    };
  }

  private buildHeatmap(regions: RegionRecord[], year: number, fromYear: number, toYear: number) {
    return regions.map((region) => {
      const population = region.populationByYear[year] ?? 0;
      const from = region.populationByYear[fromYear] ?? 0;
      const to = region.populationByYear[toYear] ?? 0;
      const changePercent = this.changePercent(from, to);
      return {
        regionId: region.id,
        regionName: region.name,
        population,
        density: this.round(population / 1000, 2),
        changePercent: this.round(changePercent, 2),
        score: this.round(changePercent, 2),
      };
    });
  }

  private buildTable(
    municipalities: MunicipalityRecord[],
    year: number,
    fromYear: number,
    toYear: number,
    page: number,
    pageSize: number,
    sortBy: SortBy,
    sortOrder: SortOrder,
  ) {
    const rows = municipalities.map((municipality) => {
      const population = municipality.populationByYear[year] ?? 0;
      const from = municipality.populationByYear[fromYear] ?? 0;
      const to = municipality.populationByYear[toYear] ?? 0;
      const metrics = this.dataService.getDemographyAtYear(municipality.demographyByYear, year);
      return {
        entityId: municipality.id,
        name: municipality.name,
        subjectName: municipality.regionName,
        municipalityType: municipality.municipalityType,
        population,
        changePercent: this.round(this.changePercent(from, to), 2),
        birthRate: metrics.birthRate,
        deathRate: metrics.deathRate,
        migrationRate: metrics.migrationRate,
        naturalGrowth: metrics.naturalGrowth,
      };
    });

    rows.sort((a, b) =>
      this.compareValues(
        this.valueForSort(a, sortBy),
        this.valueForSort(b, sortBy),
        sortOrder,
        a.name,
        b.name,
      ),
    );

    const start = (page - 1) * pageSize;
    const paginatedRows = rows.slice(start, start + pageSize);

    return {
      total: rows.length,
      page,
      pageSize,
      rows: paginatedRows.map((row) => ({
        entityId: row.entityId,
        name: row.name,
        subjectName: row.subjectName,
        municipalityType: row.municipalityType,
        population: row.population,
        changePercent: row.changePercent,
        birthRate: row.birthRate,
        deathRate: row.deathRate,
        migrationRate: row.migrationRate,
        naturalGrowth: row.naturalGrowth,
      })),
    };
  }

  private buildTops(
    municipalities: MunicipalityRecord[],
    year: number,
    fromYear: number,
    toYear: number,
  ) {
    const prepared = municipalities.map((municipality) => {
      const from = municipality.populationByYear[fromYear] ?? 0;
      const to = municipality.populationByYear[toYear] ?? 0;
      return {
        entityId: municipality.id,
        name: municipality.name,
        population: municipality.populationByYear[year] ?? 0,
        changePercent: this.round(this.changePercent(from, to), 2),
      };
    });

    const growth = [...prepared]
      .sort((a, b) => b.changePercent - a.changePercent || b.population - a.population)
      .slice(0, 10);
    const decline = [...prepared]
      .sort((a, b) => a.changePercent - b.changePercent || b.population - a.population)
      .slice(0, 10);

    return { growth, decline };
  }

  private buildSelectedEntity(requestId: string, request: FinalDataRequest) {
    const selected = request.selectedEntity;
    if (!selected) {
      return undefined;
    }

    const profile = this.dataService.getEntityProfile(selected.entityLevel, selected.entityId);
    const history = this.dataService.getEntityPopulationSeries(
      selected.entityLevel,
      selected.entityId,
    );
    const demography = this.dataService.getEntityDemographySeries(
      selected.entityLevel,
      selected.entityId,
    );

    const forecast =
      request.includeForecast === true
        ? this.forecastService.getForecastResult(requestId, {
            entityLevel: selected.entityLevel,
            entityId: selected.entityId,
            horizonYears: request.horizonYears ?? 5,
            confidenceLevel: request.confidenceLevel ?? 0.95,
          }).forecast
        : undefined;

    return {
      profile: {
        entityId: profile.id,
        name: profile.name,
        level: profile.level,
        subjectName: profile.subjectName,
        municipalityType: profile.municipalityType,
      },
      history,
      demography,
      forecast,
    };
  }

  private valueForSort(
    row: {
      population: number;
      changePercent: number;
      birthRate: number | null;
      deathRate: number | null;
      migrationRate: number | null;
      naturalGrowth: number | null;
    },
    sortBy: SortBy,
  ): number {
    if (sortBy === 'population') {
      return row.population;
    }
    if (sortBy === 'changePercent') {
      return row.changePercent;
    }
    if (sortBy === 'birthRate') {
      return row.birthRate ?? Number.NEGATIVE_INFINITY;
    }
    if (sortBy === 'deathRate') {
      return row.deathRate ?? Number.NEGATIVE_INFINITY;
    }
    if (sortBy === 'migrationRate') {
      return row.migrationRate ?? Number.NEGATIVE_INFINITY;
    }
    return row.naturalGrowth ?? Number.NEGATIVE_INFINITY;
  }

  private compareValues(
    a: number,
    b: number,
    order: SortOrder,
    tieA: string,
    tieB: string,
  ): number {
    const direction = order === 'asc' ? 1 : -1;
    if (a === b) {
      return tieA.localeCompare(tieB, 'ru');
    }
    return (a - b) * direction;
  }

  private validatePeriod(fromYear: number, toYear: number): void {
    if (fromYear > toYear) {
      throw new BadRequestException({
        errorCode: 'INVALID_PERIOD',
        message: 'periodFromYear must be less than or equal to periodToYear',
      });
    }
  }

  private sum(values: number[]): number {
    return values.reduce((acc, value) => acc + value, 0);
  }

  private averageNullable(values: Array<number | null>): number {
    const valid = values.filter((value): value is number => value !== null);
    if (valid.length === 0) {
      return 0;
    }
    return this.sum(valid) / valid.length;
  }

  private changePercent(from: number, to: number): number {
    if (!Number.isFinite(from) || from === 0) {
      return 0;
    }
    return ((to - from) / from) * 100;
  }

  private round(value: number, digits = 2): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }
}

