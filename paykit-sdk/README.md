# @paykit/sdk

Official PayKit JavaScript/TypeScript SDK for payments, wallets, and checkout.

## Install

```bash
npm install @paykit/sdk
```

## Usage

```ts
import PayKit from "@paykit/sdk";

const client = PayKit({
  apiKey: "pk_your_api_key",
  baseUrl: "https://api.paykit.io", // optional, defaults to your API URL
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
// Redirect customer to checkout.walletAddress or use hosted embed with checkout.id
```

## Hosted checkout embed

Load the script and open checkout by session ID (create session via API first):

```html
<script src="https://paykit.io/sdk.js"></script>
<script>
  PayKit.checkout({ sessionId: "your_checkout_session_id" });
  // Or open in new tab:
  PayKit.checkout({ sessionId: "your_checkout_session_id", openInNewTab: true });
</script>
```

Set `window.PAYKIT_BASE_URL` before loading the script to use a different base URL (e.g. for testing).
