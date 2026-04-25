import { expect, describe, it, beforeAll, afterAll } from '@jest/globals';

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Population Forecasting API (e2e)', () => {
  let app: INestApplication<App>;
  let regionId: string;
  let maxYear: number;
  const prevGigachatAuthKey = process.env.GIGACHAT_AUTH_KEY;
  const prevGigachatDisabled = process.env.GIGACHAT_DISABLED;

  beforeAll(async () => {
    delete process.env.GIGACHAT_AUTH_KEY;
    process.env.GIGACHAT_DISABLED = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const filtersResponse = await request(app.getHttpServer())
      .get('/api/v1/dashboard/filters')
      .expect(200);
    regionId = filtersResponse.body.subjects[0].id as string;
    maxYear = filtersResponse.body.yearRange.maxYear as number;
  });

  afterAll(async () => {
    await app.close();
    if (prevGigachatAuthKey === undefined) {
      delete process.env.GIGACHAT_AUTH_KEY;
    } else {
      process.env.GIGACHAT_AUTH_KEY = prevGigachatAuthKey;
    }

    if (prevGigachatDisabled === undefined) {
      delete process.env.GIGACHAT_DISABLED;
    } else {
      process.env.GIGACHAT_DISABLED = prevGigachatDisabled;
    }
  });

  it('GET /api/v1/dashboard/filters returns filters dictionary', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/dashboard/filters').expect(200);
    expect(response.body.subjects.length).toBeGreaterThan(0);
    expect(response.body.municipalityTypes.length).toBe(3);
  });

  it('POST /api/v1/forecast/result returns forecast payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/forecast/result')
      .send({
        entityLevel: 'region',
        entityId: regionId,
        horizonYears: 5,
        confidenceLevel: 0.95,
      })
      .expect(201);

    expect(response.body.forecast).toHaveLength(5);
    expect(response.body.model.name).toBe('holt-linear');
    expect(response.body.history.length).toBeGreaterThanOrEqual(3);
    expect(response.body.entity.id).toBe(regionId);
    expect(response.body.model.trainedToYear).toBe(maxYear);
  });

  it('POST /api/v1/forecast/result returns 400 for invalid horizon', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/forecast/result')
      .send({
        entityLevel: 'region',
        entityId: regionId,
        horizonYears: 4,
      })
      .expect(400);

    expect(response.body.errorCode).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/forecast/result returns 404 for unknown entity', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/forecast/result')
      .send({
        entityLevel: 'region',
        entityId: 'region-999999',
        horizonYears: 5,
      })
      .expect(404);

    expect(response.body.errorCode).toBe('ENTITY_NOT_FOUND');
  });

  it('POST /api/v1/forecast/metrics returns model quality metrics', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/forecast/metrics')
      .send({
        entityLevel: 'region',
        entityId: regionId,
        horizonYears: 5,
        backtestWindowYears: 5,
      })
      .expect(201);

    expect(response.body.metrics).toHaveProperty('mape');
    expect(response.body.metrics).toHaveProperty('rmse');
    expect(response.body.metrics).toHaveProperty('mae');
  });

  it('POST /api/v1/forecast/metrics returns 404 for unknown entity', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/forecast/metrics')
      .send({
        entityLevel: 'region',
        entityId: 'region-unknown',
        horizonYears: 5,
      })
      .expect(404);
  });

  it('POST /api/v1/dashboard/final-data returns dashboard payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/dashboard/final-data')
      .send({
        year: maxYear,
        periodFromYear: maxYear - 5,
        periodToYear: maxYear,
        page: 1,
        pageSize: 20,
        sortBy: 'population',
        sortOrder: 'desc',
        selectedEntity: { entityLevel: 'region', entityId: regionId },
        includeForecast: true,
        horizonYears: 5,
      })
      .expect(201);

    expect(response.body.summary).toBeDefined();
    expect(response.body.heatmap.length).toBeGreaterThan(0);
    expect(response.body.table.rows.length).toBeGreaterThan(0);
    expect(response.body.tops.growth.length).toBeGreaterThan(0);
    expect(response.body.selectedEntity.profile.entityId).toBe(regionId);
    expect(response.body.selectedEntity.forecast).toHaveLength(5);
    expect(response.body.summary.totalPopulation).toBeGreaterThan(0);
  });

  it('POST /api/v1/analytics/context returns prepared analytics context', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/analytics/context')
      .send({
        entityLevel: 'region',
        entityId: regionId,
        year: maxYear,
        periodFromYear: maxYear - 5,
        periodToYear: maxYear,
        horizonYears: 5,
        confidenceLevel: 0.95,
      })
      .expect(201);

    expect(response.body.entity.id).toBe(regionId);
    expect(response.body.monitoring.history.length).toBeGreaterThan(0);
    expect(response.body.forecast.points).toHaveLength(5);
    expect(response.body.demography.keySignals.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/analytics/report returns structured report payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/analytics/report')
      .send({
        entityLevel: 'region',
        entityId: regionId,
        year: maxYear,
        periodFromYear: maxYear - 5,
        periodToYear: maxYear,
        horizonYears: 5,
        confidenceLevel: 0.95,
      })
      .expect(201);

    expect(response.body.generation.provider).toBe('fallback');
    expect(response.body.report.title).toContain('Аналитическая справка');
    expect(response.body.report.demographicTrends.length).toBeGreaterThan(0);
    expect(response.body.report.policyRecommendations.length).toBeGreaterThan(0);
    expect(response.body.report.planningRecommendations.length).toBeGreaterThan(0);
  });

  it('POST /api/v1/analytics/report/export returns PDF document', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/analytics/report/export')
      .send({
        entityLevel: 'region',
        entityId: regionId,
        year: maxYear,
        periodFromYear: maxYear - 5,
        periodToYear: maxYear,
        horizonYears: 5,
        confidenceLevel: 0.95,
        format: 'pdf',
      })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(201);

    expect(response.header['content-type']).toContain('application/pdf');
    expect(response.header['content-disposition']).toContain('attachment; filename=');
    expect(Buffer.isBuffer(response.body)).toBeTruthy();
    expect(response.body.length).toBeGreaterThan(1000);
  });
});
