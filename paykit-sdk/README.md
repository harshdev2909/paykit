# @paykit/sdk

Official PayKit JavaScript/TypeScript SDK for stablecoin payments, wallets, checkout, swaps, and fiat ramps.

- **API:** [https://paykit.onrender.com](https://paykit.onrender.com)
- **Dashboard & Docs:** [https://paykit.vercel.app](https://paykit.vercel.app)

## Install

```bash
npm install @paykit/sdk
```

## Usage

By default the client uses the PayKit production API. Override `baseUrl` for a self-hosted or staging backend.

```ts
import { createClient } from "@paykit/sdk";

const client = createClient({
  apiKey: "pk_your_api_key",
  // baseUrl defaults to https://paykit.onrender.com
  baseUrl: "https://paykit.onrender.com", // optional
});

// Create a wallet
const wallet = await client.createWallet();
console.log(wallet.publicKey);

// Get balance
const balances = await client.getBalance(wallet.id);

// Send payment
const { txHash } = await client.sendPayment({
  fromWalletId: wallet.id,
  toAddress: "G...",
  asset: "USDC",
  amount: "10",
});

// Create checkout session
const checkout = await client.createCheckout({
  amount: "50",
  asset: "USDC",
  success_url: "https://yoursite.com/success",
  cancel_url: "https://yoursite.com/cancel",
});

// Swap (with optional quote first)
const quote = await client.getSwapQuote({ walletId: wallet.id, fromAsset: "USDC", toAsset: "XLM", amount: "100" });
if (quote.pathAvailable) await client.swap({ walletId: wallet.id, fromAsset: "USDC", toAsset: "XLM", amount: "100" });
```

## Hosted checkout embed

Use the dashboard at [paykit.vercel.app](https://paykit.vercel.app) to create checkout sessions. Then embed:

```html
<script src="https://paykit.vercel.app/sdk.js"></script>
<script>
  PayKit.checkout({ sessionId: "your_checkout_session_id" });
</script>
```

Set `window.PAYKIT_BASE_URL` before loading the script to use a different API URL.
