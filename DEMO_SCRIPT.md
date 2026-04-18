# PayKit demo script (local / testnet)

Use this as a checklist when showing PayKit end-to-end on **Stellar testnet** with the monorepo apps.

## Prerequisites

1. **MongoDB** — merchant users, API keys, agent wallets (`MONGODB_URI`).
2. **PostgreSQL** — receipts / webhook delivery metadata (`DATABASE_URL`); run Prisma migrate from `apps/api`.
3. **Redis** (optional) — rate limits, webhook queue, SSE hub; API starts without it with reduced features.
4. **Environment** — copy `apps/api/.env.example` to `apps/api/.env` and set at least:
   - `WALLET_ENCRYPTION_KEY` — 64 hex chars (required for `POST /v1/wallets` and funding paths).
   - `DATABASE_URL`, `MONGODB_URI`.
5. **Merchant API key** — create a merchant (`POST /merchant/create` as documented in `apps/api/README.md`) or use the dashboard after OAuth; copy the `apiKey` (`pk_...`).

## Start services

Terminal 1 — API:

```bash
cd apps/api
pnpm install
pnpm run build
pnpm run dev
```

Terminal 2 — Web (optional):

```bash
cd apps/web
pnpm install
pnpm run dev
```

Set `NEXT_PUBLIC_PAYKIT_API_URL=http://localhost:3000` in `apps/web/.env.local` to use the **Playground** against your local API.

## Happy-path API checks

With the API listening (default `http://127.0.0.1:3000`):

```bash
export E2E_API_KEY=pk_your_key_here
export E2E_BASE_URL=http://127.0.0.1:3000
pnpm test:e2e:api
```

This runs `apps/api/e2e/happy-path.mjs`: `GET /health`, `GET /v1/x402/supported`, `POST /v1/x402/verify`, `POST /v1/x402/settle`, `GET /v1/receipts`.

Optional — include **agent wallet** creation on testnet (Friendbot):

```bash
export E2E_AGENT_WALLET=1
pnpm test:e2e:api
```

## Browser

1. Open the web app (`/`).
2. Visit **`/docs`** for v1 routes.
3. Visit **`/playground`** — set base URL and `x-api-key`, call `GET /v1/x402/supported`.
4. **`/dashboard`** — sign in and manage API keys as before.

## Observability (optional)

To export traces from the API process, set (see `apps/api/.env.example`):

- `OTEL_EXPORTER_OTLP_ENDPOINT` — e.g. `http://localhost:4318/v1/traces`, or  
- `OTEL_TRACES_EXPORTER=console` — log spans to stdout.

Disable with `OTEL_SDK_DISABLED=true`.

## Contract (Soroban)

Spending policy contract deploy is under `contracts/spending-policy/`; contract id lives in `.env.testnet` after deploy. Wire to wallet policy flows as your integration matures.
