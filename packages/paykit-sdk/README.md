# @h4rsharma/paykit-sdk

Thin aggregator: re-exports **x402 middleware**, **agent wallet SDK**, and **receipts** in one dependency.

## Install

```bash
npm install @h4rsharma/paykit-sdk
```

Individual packages (same scope):

- `@h4rsharma/paykit-x402-middleware`
- `@h4rsharma/paykit-agent-wallet-sdk`
- `@h4rsharma/paykit-receipts`

## Exports

```ts
import { paywall, createAgentWallet, verifyReceipt } from "@h4rsharma/paykit-sdk";
```

| Export               | Package        | Purpose                                      |
| -------------------- | -------------- | -------------------------------------------- |
| `paywall`            | x402-middleware | Express/Next route guard for 402 + x402      |
| `createAgentWallet` | agent-wallet   | Client helpers aligned with `/v1/wallets`   |
| `verifyReceipt`      | receipts       | Verify signed JWS receipts                  |

## Implementation status

Published versions ship **stable package names and types**; runtime behavior for the three entrypoints is still being filled in (stubs throw with a clear message). Track progress in the monorepo `packages/` directory.

## Docs

In the PayKit web app: **`/docs/packages`** (npm packages) and **`/docs`** (overview). Same paths when running locally (`apps/web`).

## License

MIT
