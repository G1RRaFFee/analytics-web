import { PopulationDataService } from './population-data.service';

describe('PopulationDataService (demography.csv)', () => {
  let service: PopulationDataService;

  beforeAll(() => {
    service = new PopulationDataService();
  });

  it('loads regions and municipalities from CSV', () => {
    const regions = service.getAllRegions();
    const municipalities = service.getMunicipalities();

    expect(regions.length).toBeGreaterThan(50);
    expect(municipalities.length).toBeGreaterThan(1500);
  });

  it('returns a valid year range in filters', () => {
    const filters = service.getFilters();

    expect(filters.yearRange.minYear).toBeGreaterThanOrEqual(2008);
    expect(filters.yearRange.maxYear).toBeGreaterThanOrEqual(filters.yearRange.minYear);
    expect(filters.subjects.length).toBeGreaterThan(50);
  });

  it('maps municipality types from dataset values', () => {
    const municipalities = service.getMunicipalities();
    const urban = municipalities.filter((item) => item.municipalityType === 'urban_okrug').length;
    const raion = municipalities.filter((item) => item.municipalityType === 'municipal_raion').length;

    expect(urban).toBeGreaterThan(100);
    expect(raion).toBeGreaterThan(100);
  });

  it('provides forecast-ready history for at least one municipality', () => {
    const candidate = service
      .getMunicipalities()
      .find(
        (municipality) =>
          service.getEntityPopulationSeries('municipality', municipality.id).length >= 6,
      );

    expect(candidate).toBeDefined();
    if (!candidate) {
      return;
    }

    const history = service.getEntityPopulationSeries('municipality', candidate.id);
    expect(history.length).toBeGreaterThanOrEqual(6);
    expect(history[0].year).toBeLessThan(history[history.length - 1].year);
    expect(history[0].population).toBeGreaterThan(0);
  });
});
