# Population Forecasting API Contracts

Base path: `/api/v1`

## Common Headers

- `Accept: application/json`
- `Content-Type: application/json` (for `POST`)
- `X-Request-Id: <string>` (optional request correlation id; echoed back in response header/body)

Authentication: not required in v1.

## Endpoints

### `POST /forecast/result`

Build population forecast with confidence interval.

Request body: `ForecastRequest`  
Response body: `ForecastResultResponse`

### `POST /forecast/metrics`

Calculate model quality metrics using rolling-origin backtest.

Request body: `ForecastMetricsRequest`  
Response body: `ForecastMetricsResponse`

### `POST /dashboard/final-data`

Return full dashboard payload (summary, heatmap, table, tops, selected entity profile and optional forecast).

Request body: `FinalDataRequest`  
Response body: `FinalDataResponse`

### `GET /dashboard/filters`

Return dictionaries for UI filters.

Query params:
- `subjectId` (optional)

Response body: `FiltersResponse`

### `POST /analytics/context`

Return prepared monitoring and forecast context for analytic report generation for the selected region or municipality.

Request body: `AnalyticsContextRequest`  
Response body: `AnalyticsContextResponse`

### `POST /analytics/report`

Generate a structured analytical note using monitoring data, forecast and LLM orchestration.

Request body: `AnalyticsContextRequest`  
Response body: `AnalyticsReportResponse`

### `POST /analytics/report/export`

Generate and return the analytical note as a downloadable document.

Request body: `AnalyticsExportRequest`

Response:
- `application/pdf` for `format = "pdf"`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` for `format = "docx"`
- `Content-Disposition: attachment; filename="<generated-file-name>"`

## Error Contract

All API errors are returned in unified format:

```ts
interface ApiError {
  requestId: string;
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
}
```
