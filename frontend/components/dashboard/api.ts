export type EntityLevel = "region" | "municipality";
export type MunicipalityType = "urban_okrug" | "municipal_raion" | "municipal_okrug";
export type ConfidenceLevel = 0.8 | 0.9 | 0.95;

export interface DashboardFiltersResponse {
  requestId: string;
  yearRange: { minYear: number; maxYear: number };
  subjects: Array<{ id: string; name: string }>;
  municipalityTypes: Array<{ id: MunicipalityType; label: string }>;
}

export interface FinalDataRequest {
  year: number;
  periodFromYear: number;
  periodToYear: number;
  subjectId?: string;
  municipalityType?: MunicipalityType;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "population" | "changePercent" | "birthRate" | "deathRate" | "migrationRate" | "naturalGrowth";
  sortOrder?: "asc" | "desc";
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
    rows: Array<{
      entityId: string;
      name: string;
      subjectName: string;
      municipalityType: MunicipalityType;
      population: number;
      changePercent: number;
      birthRate: number | null;
      deathRate: number | null;
      migrationRate: number | null;
      naturalGrowth: number | null;
    }>;
  };
  tops: {
    growth: Array<{ entityId: string; name: string; changePercent: number; population: number }>;
    decline: Array<{ entityId: string; name: string; changePercent: number; population: number }>;
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
    forecast?: Array<{ year: number; population: number; lower: number; upper: number }>;
  };
}

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
  history: Array<{ year: number; population: number }>;
  forecast: Array<{ year: number; population: number; lower: number; upper: number }>;
  model: { name: string; trainedFromYear: number; trainedToYear: number; confidenceLevel: number };
}

export interface ForecastMetricsRequest extends ForecastRequest {
  backtestWindowYears?: number;
}

export interface ForecastMetricsResponse {
  requestId: string;
  metrics: {
    mape: number;
    rmse: number;
    mae: number;
    points: number;
    excludedZeroActuals: number;
  };
  validation: { method: "rolling-origin"; backtestWindowYears: number };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

export async function getDashboardFilters(): Promise<DashboardFiltersResponse> {
  const response = await fetch(`${baseUrl()}/api/v1/dashboard/filters`, { cache: "no-store" });
  return parseResponse<DashboardFiltersResponse>(response);
}

export async function getDashboardData(request: FinalDataRequest): Promise<FinalDataResponse> {
  const response = await fetch(`${baseUrl()}/api/v1/dashboard/final-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseResponse<FinalDataResponse>(response);
}

export async function getForecastResult(request: ForecastRequest): Promise<ForecastResultResponse> {
  const response = await fetch(`${baseUrl()}/api/v1/forecast/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseResponse<ForecastResultResponse>(response);
}

export async function getForecastMetrics(request: ForecastMetricsRequest): Promise<ForecastMetricsResponse> {
  const response = await fetch(`${baseUrl()}/api/v1/forecast/metrics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseResponse<ForecastMetricsResponse>(response);
}
