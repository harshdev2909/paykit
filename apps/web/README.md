# PayKit Frontend

Next.js 14+ (App Router) frontend for PayKit — payments infrastructure for stablecoins. Connects to the PayKit backend APIs (wallets, payments, checkout, treasury, swaps, fiat ramps, docs).

## Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI:** shadcn/ui, custom components (BackgroundPaths, DynamicBorderAnimationsCard)
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **State:** React Query + Zustand
- **HTTP:** Axios

## Structure

```
app/
  page.tsx                 # Landing (Hero, Features, CTA)
  dashboard/               # Merchant dashboard
    layout.tsx
    page.tsx               # Overview
    payments/page.tsx
    wallet/page.tsx
    treasury/page.tsx
    payouts/page.tsx
    settings/page.tsx
  checkout/[sessionId]/     # Customer checkout (polling status)
components/
  ui/                       # shadcn + background-paths, dynamic-border-animations-card
  dashboard/                 # Sidebar
  payments/                  # PaymentTable
  wallet/                   # BalanceList
  checkout/                  # CheckoutForm
lib/
  services/api.ts           # Axios client + API helpers
  services/auth.ts          # API key storage helpers
  store/auth-store.ts        # Zustand + persist
  types.ts
hooks/
  use-api-key.ts
app/providers/
  react-query-provider.tsx
```

## Setup

1. Install dependencies (already done): `npm install`
2. Copy env: `cp .env.local.example .env.local`
3. Set `NEXT_PUBLIC_API_URL` to your PayKit backend (e.g. `http://localhost:3000`)
4. Run dev: `npm run dev`
5. Open [http://localhost:3001](http://localhost:3001) (or the port Next shows)

## Authentication

Merchant dashboard uses **API key** auth. In **Settings**, paste the API key returned from `POST /merchant/create`. It is stored in Zustand (persisted) and localStorage and sent as `x-api-key` on merchant API requests.

## Routes

- **/** — Landing (Hero, Features, Developers, Payments, CTA)
- **/dashboard** — Overview, recent payments, balances, analytics
- **/dashboard/payments** — Payment history table (GET /merchant/payments)
- **/dashboard/wallet** — Merchant balances + wallet lookup by ID (GET /wallet/:id)
- **/dashboard/treasury** — Treasury balance by account ID (GET /treasury/balance)
- **/dashboard/payouts** — Send payout (POST /merchant/payout)
- **/dashboard/settings** — Set/clear API key
- **/checkout/[sessionId]** — Customer checkout: amount, asset, destination address, QR code; polls GET /checkout/status/:sessionId until completed

## Build

```bash
npm run build
npm run start
```

No mock data; all data comes from the PayKit backend.
