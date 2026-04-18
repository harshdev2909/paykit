# Self-contained install: uses apps/api/package-lock.json (npm). Monorepo root uses pnpm; this lockfile is for Docker/CI only.
FROM node:20-alpine AS builder

# Prisma engines on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY --from=builder /app/dist ./dist

# Generated query engine + client from builder (prisma generate runs in npm run build)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
