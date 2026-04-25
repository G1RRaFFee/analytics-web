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
