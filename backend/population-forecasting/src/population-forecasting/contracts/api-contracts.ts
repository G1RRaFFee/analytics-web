export const ENTITY_LEVELS = ['region', 'municipality'] as const;
export type EntityLevel = (typeof ENTITY_LEVELS)[number];

export const MUNICIPALITY_TYPES = [
  'urban_okrug',
  'municipal_raion',
  'municipal_okrug',
] as const;
export type MunicipalityType = (typeof MUNICIPALITY_TYPES)[number];

export const CONFIDENCE_LEVELS = [0.8, 0.9, 0.95] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const SORT_FIELDS = [
  'population',
  'changePercent',
  'birthRate',
  'deathRate',
  'migrationRate',
  'naturalGrowth',
] as const;
export type SortBy = (typeof SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface ForecastRequest {
  entityLevel: EntityLevel;
  entityId: string;
  horizonYears: number;
  confidenceLevel?: ConfidenceLevel;
  historyFromYear?: number;
  historyToYear?: number;
}

export interface ForecastResultResponse {
  requestId: string;
  entity: { id: string; level: EntityLevel; name: string; subjectId?: string };
  history: Array<{ year: number; population: number }>;
  forecast: Array<{ year: number; population: number; lower: number; upper: number }>;
  model: {
    name: 'holt-linear';
    trainedFromYear: number;
    trainedToYear: number;
    confidenceLevel: number;
  };
}

export interface ForecastMetricsRequest extends ForecastRequest {
  backtestWindowYears?: number;
}

export interface ForecastMetricsResponse {
  requestId: string;
  entity: { id: string; level: EntityLevel; name: string };
  metrics: {
    mape: number;
    rmse: number;
    mae: number;
    points: number;
    excludedZeroActuals: number;
  };
  validation: { method: 'rolling-origin'; backtestWindowYears: number };
}

export interface FinalDataRequest {
  subjectId?: string;
  municipalityType?: MunicipalityType;
  year: number;
  periodFromYear: number;
  periodToYear: number;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  selectedEntity?: { entityLevel: EntityLevel; entityId: string };
  includeForecast?: boolean;
  horizonYears?: number;
  confidenceLevel?: ConfidenceLevel;
}

export interface FinalDataResponse {
  requestId: string;
  generatedAt: string;
  summary: {
    totalPopulation: number;
    periodChangePercent: number;
    avgBirthRate: number;
    avgDeathRate: number;
    avgMigrationRate: number;
    avgNaturalGrowth: number;
    growingRegionsCount: number;
  };
  heatmap: Array<{
    regionId: string;
    regionName: string;
    population: number;
    density: number;
    changePercent: number;
    score: number;
  }>;
  table: {
    total: number;
    page: number;
    pageSize: number;
    rows: Array<Record<string, string | number | null>>;
  };
  tops: {
    growth: Array<{
      entityId: string;
      name: string;
      changePercent: number;
      population: number;
    }>;
    decline: Array<{
      entityId: string;
      name: string;
      changePercent: number;
      population: number;
    }>;
  };
  selectedEntity?: {
    profile: {
      entityId: string;
      name: string;
      level: EntityLevel;
      subjectName?: string;
      municipalityType?: MunicipalityType;
    };
    history: Array<{ year: number; population: number }>;
    demography: Array<{
      year: number;
      birthRate: number | null;
      deathRate: number | null;
      migrationRate: number | null;
      naturalGrowth: number | null;
    }>;
    forecast?: Array<{
      year: number;
      population: number;
      lower: number;
      upper: number;
    }>;
  };
}

export interface FiltersResponse {
  requestId: string;
  yearRange: {
    minYear: number;
    maxYear: number;
  };
  subjects: Array<{ id: string; name: string }>;
  municipalityTypes: Array<{ id: MunicipalityType; label: string }>;
}

export interface ApiError {
  requestId: string;
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
}
