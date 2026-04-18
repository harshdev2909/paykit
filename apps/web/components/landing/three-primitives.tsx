"use client";

import Link from "next/link";

import { CodeBlock } from "@/components/paykit/code-block";
import { cn } from "@/lib/utils";

const MIDDLEWARE_SAMPLE = `import express from "express";
import { paywall } from "@h4rsharma/paykit-x402-middleware";

const app = express();

app.get("/weather",
  paywall({ price: "0.01", asset: "USDC" }),
  (req, res) => res.json({ temp: 32 })
);`;

const WALLET_SAMPLE = `import { createAgentWallet } from "@h4rsharma/paykit-agent-wallet-sdk";

const wallet = await createAgentWallet({
  apiKey: process.env.PAYKIT_KEY,
  policy: { dailyCap: "10.00", allowedDomains: ["api.example.com"] }
});

const res = await wallet.fetch("https://api.example.com/weather");`;

const RECEIPTS_SAMPLE = `import { verifyReceipt } from "@h4rsharma/paykit-receipts";

const receipt = await verifyReceipt(
  res.headers.get("x-payment-response"),
  { merchantId: "merch_123" }
);

console.log(receipt.amount, receipt.from, receipt.stellarTxHash);`;

const primitives = [
  {
    eyebrow: "01 · Middleware",
    pkg: "@h4rsharma/paykit-x402-middleware",
    blurb: "Turn any HTTP route into a paid endpoint with one wrapper.",
    code: MIDDLEWARE_SAMPLE,
    docsAnchor: "/docs/packages/x402-middleware#paykit-x402-middleware",
  },
  {
    eyebrow: "02 · Agent wallet",
    pkg: "@h4rsharma/paykit-agent-wallet-sdk",
    blurb: "Custodial wallet that retries x402 under your spending policy.",
    code: WALLET_SAMPLE,
    docsAnchor: "/docs/packages/agent-wallet#paykit-agent-wallet-sdk",
  },
  {
    eyebrow: "03 · Receipts",
    pkg: "@h4rsharma/paykit-receipts",
    blurb: "Verify signed receipts buyers and servers can audit.",
    code: RECEIPTS_SAMPLE,
    docsAnchor: "/docs/packages/receipts#paykit-receipts",
  },
] as const;

export function ThreePrimitives() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <h2 className="text-center text-xl font-semibold tracking-tight md:text-2xl">Three primitives. Nothing else.</h2>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {primitives.map((p) => (
          <div
            key={p.pkg}
            className={cn(
              "group flex flex-col rounded-xl border border-border bg-card p-5",
              "transition-[border-color] duration-[120ms] [transition-timing-function:var(--ease-paykit)]",
              "hover:border-[var(--paykit-accent)]",
            )}
          >
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{p.eyebrow}</p>
            <h3 className="mt-2 font-mono text-sm font-medium text-foreground">{p.pkg}</h3>
            <p className="mt-2 min-h-[2.5rem] text-sm text-muted-foreground">{p.blurb}</p>
            <div className="mt-4 flex-1">
              <CodeBlock language="typescript" code={p.code} minHeight="min-h-[200px]" />
            </div>
            <Link
              href={p.docsAnchor}
              className="mt-4 inline-flex text-sm font-medium text-[var(--paykit-accent)] underline-offset-4 hover:underline"
            >
              Read the docs →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
