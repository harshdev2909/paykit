# PayKit → x402 pivot: migration plan (Phase 0 audit)

**Status:** Phase 1 executed — monorepo under `pnpm`, API at `apps/api`, web at `apps/web`, SDK stubs under `packages/*`. See git history from `refactor: cut scope to x402 + agent wallet + receipts`.

**Repo layout (current)**

| Path | Role |
|------|------|
| `apps/api/` | Express + Mongo (Mongoose) API + Prisma placeholder |
| `apps/web/` | Next.js app |
| `packages/paykit-sdk/` | Thin `@h4rsharma/paykit-sdk` aggregator (npm scope matches `npm whoami`) |
| `packages/x402-middleware/`, `packages/agent-wallet-sdk/`, `packages/receipts/` | Stub packages until Phase 4 |

**Critical spec note:** The stack document assumes **Postgres**. The current API uses **MongoDB (Mongoose)** and `MONGODB_URI`. Phase 1+ should introduce **Postgres (e.g. Prisma)** for `receipts`, webhooks, and API-key/merchant data per the new spec, with a **forward-only** cutover (no legacy data requirement). Until then, use **MongoDB collection names** as the analog of “tables” below.

**Infra today:** `docker-compose.yml` runs **Mongo + Redis**; there is **no BullMQ, no Qdrant**. Redis (`ioredis` + `connect-redis`) backs idempotency, rate limits, event pub/sub, webhook queue, and optional stream index. For x402, re-evaluate: **receipts + idempotent webhooks** may be Postgres-primary; Redis only if worker queues or caching stay justified.

---

## 1. Files / modules to **delete** (grouped by legacy API)

Paths are relative to repo root (`paykit-core/src/...` unless noted).

### Credit

- `api/routes/credit.ts`
- `services/creditService.ts`
- `database/models/CreditLine.ts`

### Liquidity

- `api/routes/liquidity.ts`
- `services/liquidityService.ts`
- `services/liquidityRouter.ts`
- `database/models/LiquidityPosition.ts`

### FX

- `api/routes/fx.ts`
- `services/fxService.ts`

### Yield

- `api/routes/yield.ts`
- `services/yieldManager.ts`

### Treasury (strategies, balances, earn)

- `api/routes/treasury.ts`
- `treasury/treasuryService.ts`
- `services/treasuryStrategyService.ts`
- `treasury/multisigService.ts`
- `database/models/TreasuryAccount.ts`
- `database/models/TreasuryBalance.ts`
- `database/models/TreasuryTransaction.ts`

### Swap

- `api/routes/swap.ts`
- `services/swapQuoteService.ts`

### Anchors / SEP-24

- `api/routes/anchor.ts`
- `services/stellarAnchorService.ts`

### Onramp / Offramp (MoonPay / Ramp URLs — no npm SDK today)

- `api/routes/onramp.ts`
- `services/onrampService.ts`

### Generic payments & related flows (non–x402)

These are **not** the new `/v1/x402/*` proxy; remove the generic send-payment and path-payment surface.

- `api/routes/payment.ts`
- `payments/paymentService.ts`
- `services/stellarPathPayments.ts` (path payments / routing)
- `api/routes/payout.ts`
- `payments/payoutService.ts`

### Merchant API — **delete except checkout create** (Phase 1 instruction)

Remove from `api/routes/merchant.ts` (or delete file and replace with a thin router): **`/payments`, `/balance`, `/analytics`, `/payout`, `/payment-link/create`, `/wallet`, `/transactions`**. Keep **`POST /checkout/create`** (repurposed for x402 demo merchant flow).

Related merchant-only analytics/payout logic in `merchant/merchantService.ts` — delete unused exports after route cut.

### Billing & usage (dashboard tabs dropped in new product)

- `api/routes/billing.ts`
- `api/routes/usage.ts`
- `services/usageService.ts`
- Middleware: `recordUsage.ts`, `checkPlanLimits.ts`, `planRateLimit.ts` (if only used for plans)
- `database/models/UsageMetrics.ts`
- `database/models/Plan.ts` + `database/seedPlans.ts` (if billing tiers removed entirely — confirm no auth dependency)

### Events (global broadcast SSE — security hole per new spec)

- `api/routes/events.ts`
- `services/eventStreamService.ts`  
  Replace later with **`GET /events/stream`** scoped to API key / merchant (Phase 3).

### Metrics / observability stubs (replace with OpenTelemetry in Phase 6)

- `api/routes/metrics.ts`
- `services/observability.ts` — **evaluate:** replace with OTel vs delete

### Indexer / watcher (legacy payment indexing)

- `services/indexer.ts`
- `watcher/transactionWatcher.ts`
- `watcher/run.ts`
- `index.ts` boot hooks: `refreshWalletPublicKeys`, `startPaymentStream`, watcher interval — remove or narrow to agent-wallet balance refresh only after redesign

### Risk / merchant balance (if only used for old payment flows)

- `database/models/RiskEvent.ts`
- `database/models/MerchantBalance.ts` — confirm references in `merchantService` / payouts before drop

### Chains abstraction (if unused after cut)

- `chains/` — verify imports; delete if nothing left uses `StellarAdapter`

### Config / env

- `paykit-core/.env.example`: remove MoonPay/Ramp/anchor entries when code is deleted

---

### Frontend (`paykit-frontend/`) — routes & UI to **delete**

**Note:** Directory exists locally but is **not** in the root git index today; Phase 1 should vendor it under `apps/web` and track it.

**Delete routes (entire folders or `page.tsx`):**

- `app/dashboard/credit/`
- `app/dashboard/swap/` and `app/dashboard/swaps/` (duplicate naming)
- `app/dashboard/yield/`
- `app/dashboard/treasury/` and `app/dashboard/treasury/strategies/`
- `app/dashboard/payouts/`
- `app/dashboard/payments/` (replace with Receipts tab later)
- `app/dashboard/anchors/`
- `app/dashboard/liquidity/`
- `app/dashboard/fiat/` (on/off ramp)
- `app/dashboard/events/` (replace with receipt/webhook UX)
- `app/developers/billing/`
- `app/developers/usage/`

**Components likely tied to deleted flows (remove or rewrite):**

- `components/payments/` (`payment-table`, index)
- `components/checkout/checkout-form.tsx` — replace when checkout becomes x402 demo

**Sidebar:** `components/dashboard/sidebar.tsx` — replace nav with three tabs (Wallets / Receipts / API keys) per Phase 5.

**Phase 1 placeholders:**

- `app/page.tsx` — landing → **“coming soon”** stub
- `app/developers/docs/page.tsx` — **placeholder** (Phase 5 rewrites; target route may consolidate to `/docs`)

**Keep (then evolve):**

- `app/checkout/[sessionId]/` — baseline for **merchant checkout / paywall demo** until `/demo` replaces or shares flow
- `app/developers/api-keys/` — maps to **API keys** tab
- `app/dashboard/settings/`, auth wrapper `DashboardAuth.tsx`, `lib/`, shared `components/ui/*`

---

## 2. Files / modules to **keep** and new role

| Area | Paths | New role |
|------|-------|----------|
| Auth | `api/routes/auth.ts`, `auth/passport.ts`, `auth/jwt.ts`, `auth/session.ts` | Keep **Google OAuth + JWT** for developer dashboard |
| API keys | `api/routes/apikey.ts`, `services/apiKeyService.ts`, `database/models/ApiKey.ts` | Keep `pk_xxx`; wire to **x402 proxy** rate limits + receipt attribution |
| Organizations / users | `api/routes/organizations.ts`, `database/models/User.ts`, `Organization.ts`, `OrganizationMember.ts` | Keep dashboard identity; trim plan/billing coupling |
| Merchants | `database/models/Merchant.ts`, `merchant/merchantService.ts` (partial) | **`merchant_id`** on receipts / webhooks; drop payout analytics |
| Checkout session | `api/routes/checkout.ts`, `database/models/CheckoutSession.ts` | Repurpose as **x402 demo / paywall checkout** session model (or simplify to static demo config) |
| Embedded wallet | `api/routes/embeddedWallet.ts`, `wallet/embeddedWalletService.ts`, `database/models/EmbeddedUser.ts`, `wallet/walletService.ts` (partial) | Evolve to **agent smart wallet**: Soroban **C-address**, policy, **auth-entry signing** (`/sign`); **no** localStorage on client |
| Wallet (G-address) | `api/routes/wallet.ts` (minus dead imports) | Narrow to funding/signing helpers or fold into `/v1/wallets` |
| Webhooks | `api/routes/webhooks.ts`, `services/webhookService.ts`, `database/models/WebhookSubscription.ts` | Evolve to **HMAC `whsec_`, `payment.settled` / `payment.failed`, replay, backoff**; idempotency on **`x402_nonce`** |
| Stellar core | `stellar/server.ts`, `stellar/assets.ts`, `stellar/index.ts` | Horizon/network config for testnet; extend for Soroban RPC + contract calls |
| Middleware primitives | `verifyApiKey.ts`, `rateLimit.ts`, `requireAuth.ts`, `optionalAuth.ts`, `idempotency.ts`, `merchantRateLimit.ts` | Retune for `/v1/x402/*` and receipts |
| Checkout status | Public `GET /checkout/status/:sessionId` | May map to **demo session status** or redirect to receipts |

---

## 3. **Net-new** files / modules (by phase)

### Phase 1 — Monorepo layout (pnpm)

- `pnpm-workspace.yaml`
- `packages/x402-middleware/` — Express + Next wrappers; facilitator client
- `packages/agent-wallet-sdk/` — fetch interceptor + `/sign`
- `packages/receipts/` — JWS verify + JWKS helper types
- `packages/paykit-sdk/` or root `paykit-sdk` — thin re-export aggregator (`@h4rsharma/paykit-x402-middleware`, `@h4rsharma/paykit-agent-wallet-sdk`, `@h4rsharma/paykit-receipts`)
- `apps/api/` — migrated from `paykit-core` (or rename in place)
- `apps/web/` — migrated from `paykit-frontend`
- `contracts/spending-policy/` — Soroban crate (Phase 2)

### Phase 2 — Soroban

- `contracts/spending-policy/` — `SpendingPolicy` + OZ Smart Account plugin wiring
- `contracts/spending-policy/scripts/deploy.ts` + `.env.testnet` contract id

### Phase 3 — API surface **(implemented)**

- Agent wallet: `POST/PATCH/GET /v1/wallets`, `POST .../fund`, `POST .../policy`, `POST .../sign` (API key auth)
- x402 proxy: `POST /v1/x402/verify`, `POST /v1/x402/settle`, `GET /v1/x402/supported` (1m in-memory cache)
- Receipts: `GET /v1/receipts`, `GET /v1/receipts/:id`, `POST /v1/webhooks`, `POST /v1/webhooks/:id/replay`, `GET /events/stream` (scoped SSE)
- Postgres: Prisma migration `20260418120000_phase3_api_surface` — **receipts**, **webhook_deliveries**, **merchant_receipt_signing_keys**

### Phase 4 — Tooling **(implemented)**

- `changesets` — `.changeset/config.json` (linked `@h4rsharma/paykit-sdk` + sibling packages; `ignore` apps/contracts). Run `pnpm changeset`, then `pnpm version-packages`, then `pnpm publish-packages` (after npm login). Use an npm scope you control (e.g. your username) so first publish succeeds without creating a separate `@paykit` org.

### Phase 5 — Frontend routes **(implemented)**

- `app/(site)/` — `layout` + `SiteHeader` (Home, Demo, Docs, Dashboard, Playground)
- Routes: `/`, `/demo`, `/dashboard`, `/docs`, `/playground`; `app/developers/docs` redirects to `/docs`
- Dashboard sidebar / dashboard home link to `/docs` and `/developers/api-keys`
- Playground: optional HTTP tester (`NEXT_PUBLIC_PAYKIT_API_URL`, `x-api-key`); legacy `/checkout/*` and `/developers/*` remain for checkout + API keys

### Phase 6 — Ops & docs **(implemented)**

- **E2E:** `apps/api/e2e/happy-path.mjs` — `pnpm test:e2e:api` (needs `E2E_API_KEY`, optional `E2E_BASE_URL`; optional `E2E_AGENT_WALLET=1` for `POST /v1/wallets`)
- **OTel:** `apps/api/src/telemetry.ts` — opt-in via `OTEL_EXPORTER_OTLP_ENDPOINT` or `OTEL_TRACES_EXPORTER=console`; disable with `OTEL_SDK_DISABLED=true`
- **`DEMO_SCRIPT.md`** — local demo checklist
- **`README.md` (root)** — architecture overview and table of packages

---

## 4. Database: drop / keep / new

### Current MongoDB collections (Mongoose models → collection names implied)

**Drop (with collections)**

| Collection / model | Reason |
|--------------------|--------|
| `creditlines` | Credit API removed |
| `liquiditypositions` | Liquidity removed |
| `treasuryaccounts`, `treasurybalances`, `treasurytransactions` | Treasury removed |
| `usagemetrics` | Usage tab / billing removed |
| `plans` | If no subscription tiers |
| `riskevents` | If unused |
| `merchantbalances` | If only legacy payout flow |

**Keep (reshape)**

| Collection / model | Notes |
|--------------------|-------|
| `users`, `organizations`, `organizationmembers` | Dashboard auth |
| `apikeys` | Programmatic access; link to merchant |
| `merchants` | `merchant_id` for receipts |
| `auditlogs` | Optional retention |
| `wallets`, `balances`, `transactions`, `embeddedusers` | Replace/evolve into **agent wallet + Soroban** model; many fields become obsolete |
| `webhooksubscriptions` | Extend for new event types + HMAC secrets |
| `checkoutsessions`, `paymentlinks` | Checkout demo only — **payment links** may be deleted if unused |

**New (Postgres-oriented names — align with Phase 3)**

| Table | Purpose |
|-------|---------|
| `receipts` | As spec: `id`, `merchant_id`, `api_key_id`, `wallet_from`, `wallet_to`, `asset`, `amount`, `domain`, `path`, `x402_nonce`, `facilitator_tx_hash`, `stellar_tx_hash`, `status`, `signed_receipt`, `created_at`, `settled_at` |
| `webhook_deliveries` (optional normalization) | Retry state, last error, attempt count — or embed in receipts + dead-letter |
| `merchant_receipt_signing_keys` | JWKS material for `signed_receipt` JWS |

**Forward-only migration plan**

1. Add Postgres + Prisma (or similar) alongside Mongo during Phase 1–3 or cut Mongo after dual-write window — **pre-mainnet, no preservation**: simplest path is **new Postgres schema only** and drop Mongo collections once API no longer references them.
2. Single migration chain from empty DB → receipts + merchants + api_keys + users as needed.

---

## 5. npm / Cargo dependencies

### Remove / stop adding (when deleting code)

**JavaScript (paykit-core / future apps/api)**

- Nothing for **MoonPay/Ramp npm packages** — integration is URL-based today; remove **code + env**, not a package
- **mongoose** — remove when Mongo is fully replaced (Phase 3); until then keep if straddling
- **Optional trim:** `ioredis`, `redis`, `connect-redis` — only if webhook queue + rate limit + idempotency move to Postgres/another mechanism

**paykit-sdk**

- Remove axios calls to deleted routes; shrink to re-exports of new packages

**Frontend**

- No MoonPay/Ramp packages in current `package.json`; no change until new deps are added for wallets (e.g. Freighter/Lobstr — add only when implementing signing UI)

### Add (later phases)

- `@openzeppelin/stellar-contracts` (Rust / Soroban)
- `soroban-sdk` (contract + tests)
- `@stellar/stellar-sdk` (already in core; use in deploy script)
- `zod` — **required** per guardrails for every public API
- `@opentelemetry/*` — Phase 6
- `changesets` — Phase 4
- Prisma + `pg` (or equivalent) — when Postgres lands

### Cargo (Phase 2)

- Standard Soroban + OpenZeppelin Stellar deps per their docs; pin versions in crate manifest

---

## 6. Ambiguities for human resolution **before Phase 1**

1. **`paykit-frontend` tracking:** Nested `.git` + untracked at repo root — confirm whether to **submodule**, **subtree**, or **remove nested `.git`** and commit as `apps/web`.
2. **Mongo vs Postgres timing:** Replace Mongo in Phase 1 with Postgres + Prisma as Phase 1 bullet says, or **defer Postgres** to Phase 3 and only delete routes in Phase 1 — affects whether `mongoose` stays temporarily.
3. **Merchant routes:** Spec says delete all `/merchant/*` except checkout — **`POST /merchant/create`** (unauthenticated merchant bootstrap) — keep or replace with dashboard-only merchant provisioning?
4. **`/wallet` vs `/v1/wallets`:** Full replacement vs parallel versioning during migration.
5. **`blockchainWebhook` route:** Merge into `POST /v1/webhooks` or delete if redundant with new subscription API.
6. **Freighter/Lobstr:** Confirm packages (e.g. `@stellar/freighter-api`) when implementing browser signing.

---

## 7. Phase 1 commit message (reference)

```text
chore: migration plan for x402 pivot
```

(This Phase 0 commit adds only this document.)

---

_End of Phase 0 audit._
