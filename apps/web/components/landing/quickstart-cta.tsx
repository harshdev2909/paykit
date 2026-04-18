"use client";

import Link from "next/link";

import { TerminalBlock } from "@/components/paykit/terminal-block";

const quickstartTerminalLines = [
  "$ npm install @h4rsharma/paykit-x402-middleware @h4rsharma/paykit-sdk",
  "",
  "$ export PAYKIT_KEY=pk_test_...",
  "",
  "# 1. Wrap an endpoint",
  'app.get("/weather", paywall({ price: "0.01", asset: "USDC" }), handler);',
  "",
  "# 2. Test it",
  "$ curl -i http://127.0.0.1:8080/weather",
  "HTTP/1.1 402 Payment Required",
  'X-Payment-Required: { "asset": "USDC", "amount": "0.01", ... }',
  "",
  "# 3. Pay with an agent wallet",
  '$ curl -H "X-Payment: $(paykit pay --to /weather)" http://127.0.0.1:8080/weather',
  "HTTP/1.1 200 OK",
  "X-Payment-Response: rcpt_01HF9Z...",
  '{"temp": 32}',
];

export function QuickstartCta() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-24">
      <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Ship a paid endpoint in 5 minutes.</h2>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/docs"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Start building →
        </Link>
        <Link
          href="/demo"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
        >
          See the demo →
        </Link>
      </div>
      <div className="mt-10 text-left">
        <TerminalBlock lines={quickstartTerminalLines} minHeight="min-h-[280px]" />
      </div>
    </section>
  );
}
