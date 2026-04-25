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

  beforeAll(async () => {
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

    const snapshotReady = {
      ...response.body,
      requestId: 'sanitized',
    };
    expect(snapshotReady).toMatchSnapshot();
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

    const snapshotReady = {
      ...response.body,
      requestId: 'sanitized',
      generatedAt: 'sanitized',
    };
    expect(snapshotReady).toMatchSnapshot();
  });
});
