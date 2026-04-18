# Monorepo-aware paths via API_PATH:
#
# 1) Build from repository root (recommended):
#      docker build -f apps/api/Dockerfile .
#    Uses default API_PATH=apps/api
#
# 2) Build context is only apps/api (many PaaS defaults):
#      docker build -f Dockerfile --build-arg API_PATH=. .
#    Run from inside apps/api, or set API_PATH=. in your UI’s build args.
#
# Self-contained npm install: apps/api/package-lock.json (repo root uses pnpm).
FROM node:20-alpine AS builder
ARG API_PATH=apps/api

RUN apk add --no-cache openssl

WORKDIR /app

COPY ${API_PATH}/package.json ${API_PATH}/package-lock.json ./
RUN npm ci

COPY ${API_PATH}/tsconfig.json ./
COPY ${API_PATH}/prisma ./prisma
COPY ${API_PATH}/src ./src

RUN npm run build

FROM node:20-alpine
ARG API_PATH=apps/api

RUN apk add --no-cache openssl

WORKDIR /app

COPY ${API_PATH}/package.json ${API_PATH}/package-lock.json ./
RUN npm ci --omit=dev

COPY ${API_PATH}/prisma ./prisma
COPY --from=builder /app/dist ./dist

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
