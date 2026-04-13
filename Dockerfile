# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY agent-service/package.json ./agent-service/package.json
COPY dashboard/package.json ./dashboard/package.json
RUN pnpm install --frozen-lockfile=false

FROM base AS build
COPY agent-service ./agent-service
COPY dashboard ./dashboard
RUN pnpm --filter @patricon/agent-service build
RUN pnpm --filter @patricon/dashboard build

FROM node:20-alpine AS agent-runtime
WORKDIR /app
RUN corepack enable
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/agent-service/dist ./agent-service/dist
COPY agent-service/package.json ./agent-service/package.json
CMD ["node", "agent-service/dist/index.js"]

FROM nginx:1.27-alpine AS dashboard-runtime
COPY --from=build /app/dashboard/dist /usr/share/nginx/html
