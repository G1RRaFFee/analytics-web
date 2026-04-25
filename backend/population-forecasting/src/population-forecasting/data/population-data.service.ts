import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type {
  EntityLevel,
  FiltersResponse,
  MunicipalityType,
} from '../contracts/api-contracts';
import type {
  DemographyPoint,
  EntityProfile,
  MunicipalityRecord,
  PopulationPoint,
  RegionRecord,
} from './data.types';

interface CsvDemographyRow {
  line: number;
  oktmo: string;
  region: string;
  municipalityTypeRaw: string;
  municipality: string;
  year: number;
  population: number | null;
  averagePopulation: number | null;
  births: number | null;
  deaths: number | null;
  migration: number | null;
  birthRate: number | null;
  deathRate: number | null;
  migrationRate: number | null;
}

interface RegionYearAccumulator {
  population: number;
  birthWeightedSum: number;
  birthWeight: number;
  birthSum: number;
  birthCount: number;
  deathWeightedSum: number;
  deathWeight: number;
  deathSum: number;
  deathCount: number;
  migrationWeightedSum: number;
  migrationWeight: number;
  migrationSum: number;
  migrationCount: number;
}

interface MunicipalityAccumulator {
  oktmo: string;
  region: string;
  municipality: string;
  municipalityTypeRaw: string;
  rows: CsvDemographyRow[];
}

interface RegionAccumulator {
  name: string;
  byYear: Map<number, RegionYearAccumulator>;
}

@Injectable()
export class PopulationDataService {
  private readonly regions: RegionRecord[];
  private readonly municipalities: MunicipalityRecord[];
  private readonly regionById: Map<string, RegionRecord>;
  private readonly municipalityById: Map<string, MunicipalityRecord>;
  private readonly globalYears: number[];
  private readonly requiredCsvColumns = [
    'oktmo',
    'region',
    'mun_type',
    'municipality',
    'year',
    'population',
    'average_population',
    'deaths',
    'births',
    'migration',
    'mortality_rate',
    'birth_rate',
    'migration_rate',
  ];

  constructor() {
    const rows = this.readDatasetRows();
    const { regions, municipalities } = this.buildDataModel(rows);

    this.regions = regions;
    this.regionById = new Map(this.regions.map((region) => [region.id, region]));

    this.municipalities = municipalities;
    this.municipalityById = new Map(
      this.municipalities.map((municipality) => [municipality.id, municipality]),
    );

    this.globalYears = this.computeGlobalYears();
    if (this.globalYears.length === 0) {
      throw new Error('Dataset does not contain population history for any entity');
    }
  }

  getFilters(subjectId?: string): Omit<FiltersResponse, 'requestId'> {
    const regions = subjectId
      ? this.regions.filter((region) => region.id === subjectId)
      : this.regions;

    return {
      yearRange: {
        minYear: this.globalYears[0],
        maxYear: this.globalYears[this.globalYears.length - 1],
      },
      subjects: regions.map((region) => ({ id: region.id, name: region.name })),
      municipalityTypes: [
        { id: 'urban_okrug', label: 'Городской округ' },
        { id: 'municipal_raion', label: 'Муниципальный район' },
        { id: 'municipal_okrug', label: 'Муниципальный округ' },
      ],
    };
  }

  getAllRegions(): RegionRecord[] {
    return this.regions;
  }

  getMunicipalities(filters?: {
    subjectId?: string;
    municipalityType?: MunicipalityType;
    search?: string;
  }): MunicipalityRecord[] {
    return this.municipalities.filter((municipality) => {
      if (filters?.subjectId && municipality.regionId !== filters.subjectId) {
        return false;
      }
      if (filters?.municipalityType && municipality.municipalityType !== filters.municipalityType) {
        return false;
      }
      if (
        filters?.search &&
        !municipality.name.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }

  getEntityProfile(entityLevel: EntityLevel, entityId: string): EntityProfile {
    if (entityLevel === 'region') {
      const region = this.regionById.get(entityId);
      if (!region) {
        throw new NotFoundException({
          errorCode: 'ENTITY_NOT_FOUND',
          message: `Region with id "${entityId}" not found`,
        });
      }
      return {
        id: region.id,
        level: 'region',
        name: region.name,
        subjectId: region.id,
        subjectName: region.name,
      };
    }

    const municipality = this.municipalityById.get(entityId);
    if (!municipality) {
      throw new NotFoundException({
        errorCode: 'ENTITY_NOT_FOUND',
        message: `Municipality with id "${entityId}" not found`,
      });
    }
    return {
      id: municipality.id,
      level: 'municipality',
      name: municipality.name,
      subjectId: municipality.regionId,
      subjectName: municipality.regionName,
      municipalityType: municipality.municipalityType,
    };
  }

  getEntityPopulationSeries(
    entityLevel: EntityLevel,
    entityId: string,
    fromYear?: number,
    toYear?: number,
  ): PopulationPoint[] {
    const base =
      entityLevel === 'region'
        ? this.regionById.get(entityId)?.populationByYear
        : this.municipalityById.get(entityId)?.populationByYear;

    if (!base) {
      this.getEntityProfile(entityLevel, entityId);
      return [];
    }

    const years = Object.keys(base)
      .map(Number)
      .sort((a, b) => a - b)
      .filter((year) => (fromYear ? year >= fromYear : true))
      .filter((year) => (toYear ? year <= toYear : true));

    return years.map((year) => ({ year, population: base[year] }));
  }

  getEntityDemographySeries(entityLevel: EntityLevel, entityId: string): DemographyPoint[] {
    const base =
      entityLevel === 'region'
        ? this.regionById.get(entityId)?.demographyByYear
        : this.municipalityById.get(entityId)?.demographyByYear;

    if (!base) {
      this.getEntityProfile(entityLevel, entityId);
      return [];
    }

    return Object.keys(base)
      .map(Number)
      .sort((a, b) => a - b)
      .map((year) => ({
        year,
        birthRate: base[year].birthRate,
        deathRate: base[year].deathRate,
        migrationRate: base[year].migrationRate,
        naturalGrowth: base[year].naturalGrowth,
      }));
  }

  getPopulationAtYear(
    source: RegionRecord['populationByYear'] | MunicipalityRecord['populationByYear'],
    year: number,
  ): number | null {
    const value = source[year];
    return typeof value === 'number' ? value : null;
  }

  getDemographyAtYear(
    source: RegionRecord['demographyByYear'] | MunicipalityRecord['demographyByYear'],
    year: number,
  ): Omit<DemographyPoint, 'year'> {
    return (
      source[year] ?? {
        birthRate: null,
        deathRate: null,
        migrationRate: null,
        naturalGrowth: null,
      }
    );
  }

  ensureYearInRange(year: number): void {
    if (year < this.globalYears[0] || year > this.globalYears[this.globalYears.length - 1]) {
      throw new NotFoundException({
        errorCode: 'YEAR_OUT_OF_RANGE',
        message: `Year ${year} is outside supported range`,
      });
    }
  }

  private readDatasetRows(): CsvDemographyRow[] {
    const text = this.readDatasetText();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      throw new Error('demography.csv does not contain any data rows');
    }

    const headers = this.parseCsvLine(lines[0]).map((value) => value.replace(/^\uFEFF/, '').trim());
    this.assertRequiredColumns(headers);

    const indexByColumn = new Map(headers.map((column, index) => [column, index]));
    const rows: CsvDemographyRow[] = [];

    for (let index = 1; index < lines.length; index += 1) {
      const csvLine = lines[index];
      const columns = this.parseCsvLine(csvLine);
      if (columns.length !== headers.length) {
        throw new Error(
          `Invalid CSV shape at line ${index + 1}: expected ${headers.length} columns, got ${columns.length}`,
        );
      }

      const row = this.parseDataRow(index + 1, columns, indexByColumn);
      rows.push(row);
    }

    this.validateRows(rows);
    return rows;
  }

  private readDatasetText(): string {
    const datasetPath = this.resolveDatasetPath();
    return readFileSync(datasetPath, 'utf8');
  }

  private resolveDatasetPath(): string {
    const candidates = [
      join(__dirname, '..', '..', '..', '..', 'data', 'demography.csv'),
      join(process.cwd(), '..', 'data', 'demography.csv'),
      join(process.cwd(), 'backend', 'data', 'demography.csv'),
      join(process.cwd(), 'data', 'demography.csv'),
    ];

    const foundPath = candidates.find((path) => existsSync(path));
    if (!foundPath) {
      throw new Error(`demography.csv not found. Tried: ${candidates.join(', ')}`);
    }

    return foundPath;
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    values.push(current);
    return values;
  }

  private assertRequiredColumns(headers: string[]): void {
    const missing = this.requiredCsvColumns.filter((column) => !headers.includes(column));
    if (missing.length > 0) {
      throw new Error(`demography.csv is missing required columns: ${missing.join(', ')}`);
    }
  }

  private parseDataRow(
    line: number,
    columns: string[],
    indexByColumn: Map<string, number>,
  ): CsvDemographyRow {
    const get = (column: string): string => {
      const index = indexByColumn.get(column);
      if (index === undefined) {
        throw new Error(`Internal error: column "${column}" is not mapped`);
      }
      return columns[index]?.trim() ?? '';
    };

    const oktmo = get('oktmo');
    const region = get('region');
    const municipalityTypeRaw = get('mun_type');
    const municipality = get('municipality');
    const year = this.parseRequiredInteger(get('year'), 'year', line);

    if (!oktmo) {
      throw new Error(`Line ${line}: "oktmo" is required`);
    }
    if (!region) {
      throw new Error(`Line ${line}: "region" is required`);
    }
    if (!municipalityTypeRaw) {
      throw new Error(`Line ${line}: "mun_type" is required`);
    }
    if (!municipality) {
      throw new Error(`Line ${line}: "municipality" is required`);
    }

    return {
      line,
      oktmo,
      region,
      municipalityTypeRaw,
      municipality,
      year,
      population: this.parseNullableNumber(get('population')),
      averagePopulation: this.parseNullableNumber(get('average_population')),
      births: this.parseNullableNumber(get('births')),
      deaths: this.parseNullableNumber(get('deaths')),
      migration: this.parseNullableNumber(get('migration')),
      birthRate: this.parseNullableNumber(get('birth_rate')),
      deathRate: this.parseNullableNumber(get('mortality_rate')),
      migrationRate: this.parseNullableNumber(get('migration_rate')),
    };
  }

  private parseRequiredInteger(rawValue: string, column: string, line: number): number {
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed)) {
      throw new Error(`Line ${line}: "${column}" must be an integer, got "${rawValue}"`);
    }
    if (parsed < 1900 || parsed > 2100) {
      throw new Error(`Line ${line}: "${column}" is outside valid range: ${parsed}`);
    }
    return parsed;
  }

  private parseNullableNumber(rawValue: string): number | null {
    if (!rawValue) {
      return null;
    }
    const normalized = rawValue.replace(/\s+/g, '').replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return parsed;
  }

  private validateRows(rows: CsvDemographyRow[]): void {
    if (rows.length === 0) {
      throw new Error('demography.csv does not have valid rows');
    }

    const duplicateChecker = new Set<string>();
    const municipalityShape = new Map<
      string,
      { region: string; municipality: string; municipalityTypeRaw: string }
    >();

    for (const row of rows) {
      const duplicateKey = `${row.oktmo}:${row.year}`;
      if (duplicateChecker.has(duplicateKey)) {
        throw new Error(
          `Duplicate row detected for municipality ${row.oktmo} and year ${row.year}`,
        );
      }
      duplicateChecker.add(duplicateKey);

      const shape = municipalityShape.get(row.oktmo);
      if (!shape) {
        municipalityShape.set(row.oktmo, {
          region: row.region,
          municipality: row.municipality,
          municipalityTypeRaw: row.municipalityTypeRaw,
        });
        continue;
      }

      if (
        shape.region !== row.region ||
        shape.municipality !== row.municipality ||
        shape.municipalityTypeRaw !== row.municipalityTypeRaw
      ) {
        throw new Error(
          `Inconsistent metadata for municipality ${row.oktmo}. Check line ${row.line}`,
        );
      }
    }

    const populationPoints = rows.filter((row) => row.population !== null).length;
    if (populationPoints === 0) {
      throw new Error('demography.csv does not contain population values');
    }
  }

  private buildDataModel(rows: CsvDemographyRow[]): {
    regions: RegionRecord[];
    municipalities: MunicipalityRecord[];
  } {
    const regionAccumulators = new Map<string, RegionAccumulator>();
    const municipalityAccumulators = new Map<string, MunicipalityAccumulator>();

    for (const row of rows) {
      const municipality =
        municipalityAccumulators.get(row.oktmo) ??
        {
          oktmo: row.oktmo,
          region: row.region,
          municipality: row.municipality,
          municipalityTypeRaw: row.municipalityTypeRaw,
          rows: [],
        };

      municipality.rows.push(row);
      municipalityAccumulators.set(row.oktmo, municipality);

      const region =
        regionAccumulators.get(row.region) ?? { name: row.region, byYear: new Map() };
      const yearAcc = region.byYear.get(row.year) ?? this.createRegionYearAccumulator();

      if (row.population !== null) {
        yearAcc.population += row.population;
      }

      const birthRate = this.resolveRate(row.birthRate, row.births, row.averagePopulation);
      const deathRate = this.resolveRate(row.deathRate, row.deaths, row.averagePopulation);
      const migrationRate = this.resolveRate(row.migrationRate, row.migration, row.averagePopulation);

      this.accumulateRate(yearAcc, 'birth', birthRate, row.averagePopulation);
      this.accumulateRate(yearAcc, 'death', deathRate, row.averagePopulation);
      this.accumulateRate(yearAcc, 'migration', migrationRate, row.averagePopulation);

      region.byYear.set(row.year, yearAcc);
      regionAccumulators.set(row.region, region);
    }

    const regionNames = [...regionAccumulators.keys()].sort((a, b) => a.localeCompare(b, 'ru'));
    const regionIdByName = new Map<string, string>();
    const regions = regionNames.map((name, index) => {
      const id = `region-${index + 1}`;
      regionIdByName.set(name, id);
      const accumulator = regionAccumulators.get(name);
      if (!accumulator) {
        throw new Error(`Internal error: region accumulator missing for "${name}"`);
      }
      return this.regionFromAccumulator(id, accumulator);
    });

    const municipalities = [...municipalityAccumulators.values()]
      .sort((a, b) => {
        const byRegion = a.region.localeCompare(b.region, 'ru');
        if (byRegion !== 0) {
          return byRegion;
        }
        const byName = a.municipality.localeCompare(b.municipality, 'ru');
        if (byName !== 0) {
          return byName;
        }
        return a.oktmo.localeCompare(b.oktmo);
      })
      .map((accumulator) => {
        const regionId = regionIdByName.get(accumulator.region);
        if (!regionId) {
          throw new Error(`Internal error: region id missing for "${accumulator.region}"`);
        }
        return this.municipalityFromAccumulator(accumulator, regionId);
      })
      .filter((municipality) => Object.keys(municipality.populationByYear).length > 0);

    return { regions, municipalities };
  }

  private createRegionYearAccumulator(): RegionYearAccumulator {
    return {
      population: 0,
      birthWeightedSum: 0,
      birthWeight: 0,
      birthSum: 0,
      birthCount: 0,
      deathWeightedSum: 0,
      deathWeight: 0,
      deathSum: 0,
      deathCount: 0,
      migrationWeightedSum: 0,
      migrationWeight: 0,
      migrationSum: 0,
      migrationCount: 0,
    };
  }

  private regionFromAccumulator(id: string, accumulator: RegionAccumulator): RegionRecord {
    const years = [...accumulator.byYear.keys()].sort((a, b) => a - b);
    const populationByYear: Record<number, number> = {};
    const demographyByYear: Record<number, Omit<DemographyPoint, 'year'>> = {};

    for (const year of years) {
      const yearAcc = accumulator.byYear.get(year);
      if (!yearAcc) {
        continue;
      }
      if (yearAcc.population > 0) {
        populationByYear[year] = Math.round(yearAcc.population);
      }

      const birthRate = this.averageRate(
        yearAcc.birthWeightedSum,
        yearAcc.birthWeight,
        yearAcc.birthSum,
        yearAcc.birthCount,
      );
      const deathRate = this.averageRate(
        yearAcc.deathWeightedSum,
        yearAcc.deathWeight,
        yearAcc.deathSum,
        yearAcc.deathCount,
      );
      const migrationRate = this.averageRate(
        yearAcc.migrationWeightedSum,
        yearAcc.migrationWeight,
        yearAcc.migrationSum,
        yearAcc.migrationCount,
      );
      const naturalGrowth =
        birthRate === null || deathRate === null ? null : this.round(birthRate - deathRate, 6);

      demographyByYear[year] = {
        birthRate,
        deathRate,
        migrationRate,
        naturalGrowth,
      };
    }

    return {
      id,
      name: accumulator.name,
      populationByYear,
      demographyByYear,
    };
  }

  private municipalityFromAccumulator(
    accumulator: MunicipalityAccumulator,
    regionId: string,
  ): MunicipalityRecord {
    const populationByYear: Record<number, number> = {};
    const demographyByYear: Record<number, Omit<DemographyPoint, 'year'>> = {};

    for (const row of accumulator.rows.sort((a, b) => a.year - b.year)) {
      if (row.population !== null) {
        populationByYear[row.year] = Math.round(row.population);
      }

      const birthRate = this.resolveRate(row.birthRate, row.births, row.averagePopulation);
      const deathRate = this.resolveRate(row.deathRate, row.deaths, row.averagePopulation);
      const migrationRate = this.resolveRate(row.migrationRate, row.migration, row.averagePopulation);
      const naturalGrowth =
        birthRate === null || deathRate === null ? null : this.round(birthRate - deathRate, 6);

      demographyByYear[row.year] = {
        birthRate,
        deathRate,
        migrationRate,
        naturalGrowth,
      };
    }

    return {
      id: `municipality-${accumulator.oktmo}`,
      regionId,
      regionName: accumulator.region,
      name: accumulator.municipality,
      rawType: accumulator.municipalityTypeRaw,
      municipalityType: this.mapMunicipalityType(accumulator.municipalityTypeRaw),
      populationByYear,
      demographyByYear,
    };
  }

  private resolveRate(
    directRate: number | null,
    absoluteValue: number | null,
    averagePopulation: number | null,
  ): number | null {
    if (directRate !== null) {
      return directRate;
    }
    if (
      absoluteValue !== null &&
      averagePopulation !== null &&
      Number.isFinite(averagePopulation) &&
      averagePopulation > 0
    ) {
      return this.round(absoluteValue / averagePopulation, 6);
    }
    return null;
  }

  private accumulateRate(
    yearAcc: RegionYearAccumulator,
    metric: 'birth' | 'death' | 'migration',
    value: number | null,
    averagePopulation: number | null,
  ): void {
    if (value === null) {
      return;
    }

    const weight =
      averagePopulation !== null && Number.isFinite(averagePopulation) && averagePopulation > 0
        ? averagePopulation
        : 0;

    if (metric === 'birth') {
      if (weight > 0) {
        yearAcc.birthWeightedSum += value * weight;
        yearAcc.birthWeight += weight;
      } else {
        yearAcc.birthSum += value;
        yearAcc.birthCount += 1;
      }
      return;
    }

    if (metric === 'death') {
      if (weight > 0) {
        yearAcc.deathWeightedSum += value * weight;
        yearAcc.deathWeight += weight;
      } else {
        yearAcc.deathSum += value;
        yearAcc.deathCount += 1;
      }
      return;
    }

    if (weight > 0) {
      yearAcc.migrationWeightedSum += value * weight;
      yearAcc.migrationWeight += weight;
    } else {
      yearAcc.migrationSum += value;
      yearAcc.migrationCount += 1;
    }
  }

  private averageRate(
    weightedSum: number,
    weightedTotal: number,
    fallbackSum: number,
    fallbackCount: number,
  ): number | null {
    if (weightedTotal > 0) {
      return this.round(weightedSum / weightedTotal, 6);
    }
    if (fallbackCount > 0) {
      return this.round(fallbackSum / fallbackCount, 6);
    }
    return null;
  }

  private mapMunicipalityType(source: string): MunicipalityType {
    const normalized = source.toLowerCase();
    if (
      normalized.includes('район') ||
      normalized.includes('муниципальный район') ||
      normalized.includes('сђр°р№рѕрн') ||
      normalized.includes('р°р№рѕрн')
    ) {
      return 'municipal_raion';
    }
    if (
      normalized.includes('город') ||
      normalized.includes('городской') ||
      normalized.includes('рірѕсђрѕрґ') ||
      normalized.includes('рѕрєсђсѓрі')
    ) {
      return 'urban_okrug';
    }
    return 'municipal_okrug';
  }

  private computeGlobalYears(): number[] {
    return [
      ...new Set(
        this.regions.flatMap((region) => Object.keys(region.populationByYear).map(Number)),
      ),
    ].sort((a, b) => a - b);
  }

  private round(value: number, digits = 2): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }
}
