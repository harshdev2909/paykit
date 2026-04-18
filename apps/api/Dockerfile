
FROM node:20-alpine AS builder

# Prisma engines on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci

COPY apps/api/tsconfig.json ./
COPY apps/api/prisma ./prisma
COPY apps/api/src ./src

RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci --omit=dev

COPY apps/api/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Generated query engine + client from builder (prisma generate runs in npm run build)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
