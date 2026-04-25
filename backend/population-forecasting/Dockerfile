# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /workspace/backend/population-forecasting

COPY backend/population-forecasting/package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /workspace/backend/population-forecasting

COPY --from=deps /workspace/backend/population-forecasting/node_modules ./node_modules
COPY backend/population-forecasting/ ./
COPY backend/analytics/ /workspace/backend/analytics/
COPY backend/contracts/ /workspace/backend/contracts/

RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

RUN apk add --no-cache ttf-dejavu

COPY --from=build /workspace/backend/population-forecasting/package*.json ./
COPY --from=build /workspace/backend/population-forecasting/node_modules ./node_modules
COPY --from=build /workspace/backend/population-forecasting/dist ./dist
COPY backend/data/demography.csv ./data/demography.csv

EXPOSE 8000

CMD ["node", "dist/population-forecasting/src/main"]
