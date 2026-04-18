# PayKit Core — Stellar blockchain integration

Production-grade Stellar integration layer for PayKit (Stripe for Stellar). Uses **Stellar testnet** only; all transactions are signed and submitted to the network.

## Stack

- **Node.js** + **TypeScript**
- **@stellar/stellar-sdk** — Stellar Horizon + keypairs + transactions
- **Express** — REST API
- **MongoDB** (Mongoose) — Users, Wallets, Transactions, Balances
- **Redis** — Idempotency keys + optional queue
- **Docker** — API, Watcher, MongoDB, Redis

## Stellar network

- **Network:** Stellar Testnet  
- **Horizon:** https://horizon-testnet.stellar.org  
- **Friendbot:** https://friendbot.stellar.org  
- **USDC testnet issuer:** Configurable via `STELLAR_USDC_ISSUER` (default: Circle testnet)
- **PYUSD:** Optional, set `STELLAR_PYUSD_ISSUER` for treasury/payments

## Setup

### 1. Install and build

```bash
cd paykit-core
npm install
npm run build
```

### 2. Environment

Copy `.env.example` to `.env` and set:

- `WALLET_ENCRYPTION_KEY` — 64-character hex (32 bytes). Generate:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `MONGODB_URI` — e.g. `mongodb://localhost:27017/paykit`
- `REDIS_URL` — e.g. `redis://localhost:6379`

### 3. Run with Docker

```bash
# Set encryption key for API (required for wallet create/payment/payout)
export WALLET_ENCRYPTION_KEY=<your_64_char_hex>

docker compose up -d
```

- **API:** http://localhost:3000  
- **Watcher:** runs as separate service, streams Horizon payments and updates DB

### 4. Run locally (no Docker)

```bash
# Terminal 1: MongoDB + Redis (or use Docker only for them)
docker compose up -d mongo redis

# Terminal 2: API
npm run dev

# Terminal 3 (optional): Watcher
npm run dev:watcher
```

## API

### Wallet

- **POST /wallet/create**  
  Creates a Stellar wallet (keypair), encrypts and stores secret, funds via Friendbot.  
  Body (optional): `{ "userId": "..." }`  
  Response: `{ "id", "publicKey", "createdAt" }`

- **GET /wallet/:id**  
  Returns wallet `id`, `publicKey`, `balances` (from Horizon), `createdAt`. Private key never returned.

- **GET /wallet/:id/balance**  
  Fetches balances from Horizon and returns `{ "balances": [...] }`.

### Payment (internal)

- **POST /payment**  
  Sends a payment from a custodial wallet to another address (internal or external).  
  Headers: `idempotency-key: <unique-key>` (required).  
  Body: `{ "fromWalletId", "toAddress", "asset": "XLM" | "USDC", "amount" }`  
  Response: `{ "txHash", "status": "success" }`

### Payout (withdrawal)

- **POST /payout**  
  Withdraws from a custodial wallet to an external Stellar address.  
  Headers: `idempotency-key: <unique-key>` (required).  
  Body: `{ "walletId", "destination", "asset": "XLM" | "USDC" | "PYUSD", "amount" }`  
  Response: `{ "txHash", "status": "success" }`

### Path payments (auto FX routing)

- **POST /payment/path**  
  Stellar path payment strict send: send one asset, recipient receives another (e.g. USDC → XLM).  
  Headers: `idempotency-key: <unique-key>` (required).  
  Body: `{ "fromWalletId", "destination", "sendAsset", "sendAmount", "destAsset", "destMin" }`  
  Response: `{ "txHash", "status": "success", "pathUsed"?: {...} }`

### Anchor (SEP-24)

- **POST /anchor/deposit**  
  Request interactive deposit URL from an anchor.  
  Body: `{ "anchorDomain", "assetCode", "account", "email?", "memo?" }`  
  Response: `{ "url", "id?" }` — redirect user to `url`.

- **POST /anchor/withdraw**  
  Request interactive withdrawal URL from an anchor.  
  Body: `{ "anchorDomain", "assetCode", "account", "type?", "email?", "memo?" }`  
  Response: `{ "url", "id?" }` — redirect user to `url`.

### Treasury

- **POST /treasury/create**  
  Create a treasury account (wallet + treasury record).  
  Body: `{ "name" }`  
  Response: `{ "id", "name", "walletId", "publicKey", "createdAt" }`

- **GET /treasury/balance?treasuryAccountId=...**  
  Get treasury balances (XLM, USDC, PYUSD) from Horizon and yield info if enabled.

- **POST /treasury/allocate**  
  Allocate funds from treasury to a wallet.  
  Body: `{ "treasuryAccountId", "assetCode", "amount", "destinationWalletId" }`  
  Response: `{ "txHash" }`

- **POST /treasury/yield/enable**  
  Enable yield tracking for an asset on a treasury account.  
  Body: `{ "treasuryAccountId", "assetCode" }`

- **POST /treasury/multisig/create**  
  Create a multisig treasury (multiple signers, configurable threshold).  
  Body: `{ "name?", "signers": ["GA...", "GB...", ...], "threshold": 2 }`  
  Response: `{ "id", "name", "walletId", "publicKey", "isMultisig", "signers", "threshold", "createdAt" }`

### Merchant (payments platform)

- **POST /merchant/create**  
  Create a merchant. Body: `{ "name", "webhookUrl?" }`.  
  Response: `{ "id", "name", "apiKey", "webhookUrl?", "createdAt" }` — store `apiKey` securely.

- **GET /merchant/:id**  
  Get merchant by id (public).

- **GET /merchant/payments**  
  List completed checkout payments for the authenticated merchant. Requires `x-api-key` or `Authorization: Bearer <apiKey>`.

- **GET /merchant/balance**  
  Get merchant balances (per asset). Requires API key.

- **GET /merchant/analytics**  
  Dashboard analytics: `totalVolume`, `totalTransactions`, `assetBreakdown`. Requires API key.

- **POST /merchant/payout**  
  Withdraw funds. Body: `{ "destination", "asset", "amount" }`. Requires API key. Uses existing Stellar payment engine.

- **POST /merchant/payment-link/create**  
  Create a payment link. Body: `{ "amount", "asset", "description?" }`.  
  Response: `{ "paymentLink": "https://paykit.io/pay/<slug>", "slug", "id" }`. Requires API key.

- **POST /merchant/checkout/create**  
  Create a checkout session (Stripe-like). Body: `{ "amount", "asset", "success_url?", "cancel_url?", "description?" }`.  
  Response: `{ "id", "walletAddress", "amount", "asset", "status", "expiresAt" }` — customer sends payment to `walletAddress`. When payment is detected, session is marked completed, merchant balance credited, and `checkout.completed` webhook sent (and to `merchant.webhookUrl` if set). Requires API key.

All merchant endpoints except `create` and `GET /:id` require API key and are rate-limited per merchant. Risk events (max amount exceeded, rate limit) are stored in `RiskEvents`.

### Developer platform (OAuth, organizations, API keys, billing)

- **GET /auth/google** — Redirect to Google OAuth. Callback redirects to frontend with JWT in URL.
- **GET /auth/me** — Return current user. Header: `Authorization: Bearer <jwt>` or `?token=<jwt>`.
- **POST /auth/logout** — Clear session cookie (if using session).
- **POST /organizations** — Create organization. Auth: Bearer JWT. Body: `{ "name" }`.
- **GET /organizations** — List organizations for the authenticated user. Auth: Bearer JWT.
- **POST /apikey/create** — Create API key (hashed, prefix stored). Auth: Bearer JWT. Body: `{ "organizationId?", "name?" }`. Response includes `key` (shown once).
- **GET /apikey/list** — List API keys for an organization. Auth: Bearer JWT. Query: `organizationId?`.
- **DELETE /apikey/:id** — Revoke API key. Auth: Bearer JWT. Query: `organizationId?`.
- **GET /billing/plan** — Get current plan for organization. Auth: Bearer JWT. Query: `organizationId?`.
- **POST /billing/upgrade** — Upgrade plan. Auth: Bearer JWT. Body: `{ "organizationId", "plan": "pro" | "premium" | "enterprise" }`.
- **POST /billing/cancel** — Downgrade to free. Auth: Bearer JWT. Body: `{ "organizationId" }`.
- **GET /usage** — Get usage metrics (apiCalls, paymentsVolume, checkoutSessions) for the current month. Auth: Bearer JWT. Query: `organizationId?`, `month?`.

Plans (Free, Pro, Premium, Enterprise) are seeded on startup. Rate limits and API request limits are per plan. Usage is recorded per organization when using org-scoped API keys.

### Webhooks

- **POST /webhooks/register**  
  Register a webhook endpoint.  
  Body: `{ "url", "events": ["payment.completed", "wallet.created", "treasury.updated", "path_payment.completed", "checkout.completed", "checkout.failed", ...], "secret?" }`  
  Events are delivered via Redis queue; signature in `X-PayKit-Signature` when secret is set.

### Transactions

- **GET /transactions?walletId=...&limit=50**  
  List transactions (optionally for a wallet).  
  Response: `{ "transactions": [...] }`

- **GET /transactions/:txHash**  
  Get one transaction by hash.

### Embedded wallet (Privy-style)

- **POST /wallet/embedded/create**  
  Create or get wallet by email or social. Body: `{ "email"? | "provider", "providerId" }`.  
  Response: `{ "walletId", "publicKey", "createdAt" }`. Private keys encrypted server-side. Supports XLM, USDC, PYUSD.

- **POST /wallet/embedded/sign**  
  Sign a transaction envelope. Body: `{ "walletId", "envelopeXdr" }` (base64 XDR).  
  Response: `{ "signedEnvelopeXdr" }`.

- **GET /wallet/embedded/balance?walletId=...**  
  Get balances for an embedded wallet.

### Onramp / Offramp

- **POST /onramp/buy**  
  Start fiat onramp (MoonPay). Body: `{ "walletId", "asset?", "fiatAmount?", "fiatCurrency?", "redirectUrl?" }`.  
  Response: `{ "provider", "widgetUrl", "sessionId", "status" }` — open `widgetUrl` for user to complete purchase; funds arrive to PayKit wallet.

- **POST /onramp/withdraw**  
  Start offramp (Ramp). Body: `{ "walletId", "asset?", "amount", "destinationType?", "destinationId?" }`.  
  Response: `{ "provider", "withdrawalId", "status", "estimatedFiatAmount?", "estimatedFiatCurrency?" }`.

### On-chain swap

- **POST /swap**  
  Swap assets via Stellar path payments (best price routing).  
  Body: `{ "walletId", "fromAsset", "toAsset", "amount" }` (e.g. USDC → XLM).  
  Response: `{ "txHash", "fromAsset", "toAsset", "amount", "status" }`.

### Yield engine

- **POST /yield/deposit**  
  Deposit into yield. Body: `{ "treasuryAccountId", "asset", "amount" }`.  
  Response: `{ "positionId?", "asset", "amount" }`.

- **POST /yield/withdraw**  
  Withdraw from yield. Body: `{ "treasuryAccountId", "asset", "amount" }`.  
  Response: `{ "amount", "asset" }`.

- **GET /yield/positions?asset=...**  
  Get yield positions (APY, principal, earnings). Response: `{ "positions": [...] }`.

### Event streaming

- **GET /events/stream**  
  Server-Sent Events (SSE) stream of PayKit events: `payment.created`, `payment.completed`, `wallet.created`, `swap.executed`, `yield.updated`, `treasury.updated`, `checkout.completed`. Subscribe with `EventSource` or similar.

- **GET /events/recent?limit=50**  
  Recent events (polling). Response: `{ "events": [...] }`.

### Blockchain webhooks

- **POST /blockchain/webhook**  
  Subscribe to blockchain events. Body: `{ "event"? | "events"?, "url", "secret?" }`.  
  Events: `payment.completed`, `payment.created`, `payment.failed`, `wallet.created`, `swap.executed`, `checkout.completed`, `checkout.failed`.  
  Response: `{ "id", "url", "events", "active" }`.

### Observability

- **GET /metrics**  
  Metrics snapshot: `transactionSuccesses`, `transactionFailures`, `apiLatencySamples`. Use for monitoring and alerting.

### RPC / Node layer

- Horizon URL is resolved via `services/nodeRouter`: use `HORIZON_PRIVATE_URL` for a private node when `setNodeTier("private")` is used (e.g. in worker processes). Default is public Horizon from config.

### Indexer

- `services/indexer.ts`: optional payment indexer that streams Horizon and upserts into `Transaction`. Enable with `INDEXER_ENABLED=true` (default). Can be run alongside the existing watcher for dedicated indexing.

## Security

- Private keys encrypted at rest (AES-256-GCM). Never exposed via API.
- Transaction signing is server-side only.
- Payment and payout endpoints are idempotent (use `idempotency-key` header).
- Rate limiting on API and on payment/payout.

## Project layout

```
paykit-core/
  src/
    api/           # Express routes (wallet, payment, payout, path payment, anchor, treasury, webhooks, merchant)
    chains/        # BlockchainAdapter interface, StellarAdapter (future: SolanaAdapter, EthereumAdapter)
    merchant/      # Merchant, checkout, payment-link, balances, payouts, analytics
    services/      # crypto, redis, stellarPathPayments, liquidityRouter, stellarAnchorService, webhookService, yieldManager, paymentRouter
    stellar/       # Horizon server, asset definitions (XLM, USDC, PYUSD)
    wallet/        # Wallet creation, balance fetch, keypair loading
    payments/      # Payment and payout execution
    treasury/      # Treasury and multisig services
    database/      # Mongoose models (User, Wallet, Transaction, Balance, Treasury*, WebhookSubscription, Merchant, CheckoutSession, PaymentLink, MerchantBalance, RiskEvent)
    watcher/       # Horizon payment stream → DB + treasury tx + checkout completion
  docker-compose.yml
  Dockerfile
```

## Transaction watcher

The watcher service:

- Subscribes to Horizon payment stream: `server.payments().cursor("now").stream(...)`.
- Handles `payment`, `path_payment_strict_send`, `path_payment_strict_receive`.
- Tracks wallet, treasury, and **checkout** public keys; upserts into `Transaction` and `TreasuryTransaction`.
- When a payment is received to a **checkout session** wallet: transfers funds to merchant settlement wallet, credits `MerchantBalance`, marks session `completed`, and emits `checkout.completed` (and to merchant `webhookUrl` if set).
- Emits `treasury.updated` webhooks when treasury accounts are involved.

Run it as a separate process (e.g. `npm run dev:watcher` or Docker service `watcher`).
