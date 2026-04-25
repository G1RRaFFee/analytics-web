import type { EntityLevel, MunicipalityType } from '../contracts/api-contracts';

export interface PopulationPoint {
  year: number;
  population: number;
}

export interface DemographyPoint {
  year: number;
  birthRate: number | null;
  deathRate: number | null;
  migrationRate: number | null;
  naturalGrowth: number | null;
}

export interface RegionRecord {
  id: string;
  name: string;
  populationByYear: Record<number, number>;
  demographyByYear: Record<number, Omit<DemographyPoint, 'year'>>;
}

export interface MunicipalityRecord {
  id: string;
  regionId: string;
  regionName: string;
  name: string;
  municipalityType: MunicipalityType;
  rawType: string;
  populationByYear: Record<number, number>;
  demographyByYear: Record<number, Omit<DemographyPoint, 'year'>>;
}

export interface EntityProfile {
  id: string;
  level: EntityLevel;
  name: string;
  subjectId?: string;
  subjectName?: string;
  municipalityType?: MunicipalityType;
}

