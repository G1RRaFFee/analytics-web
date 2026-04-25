# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app

COPY backend/population-forecasting/package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY backend/population-forecasting/ ./

RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY backend/data/demography.csv ./data/demography.csv

EXPOSE 8000

CMD ["node", "dist/main"]
