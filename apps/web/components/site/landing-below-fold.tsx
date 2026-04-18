"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { CodeBlock } from "@/components/paykit/code-block";
import { TerminalBlock } from "@/components/paykit/terminal-block";
import { cn } from "@/lib/utils";

const flowSteps = [
  {
    title: "Agent sends request",
    body: (
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
        <code>{`GET /v1/weather?city=mumbai`}</code>
      </pre>
    ),
  },
  {
    title: "402 Payment Required",
    body: (
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
        <code>{`HTTP/1.1 402 Payment Required
WWW-Authenticate: x402
x-payment-required: {"scheme":"exact","network":"stellar:testnet","asset":"USDC","amount":"0.01","payTo":"G...","resource":"..."}`}</code>
      </pre>
    ),
  },
  {
    title: "Agent signs & retries",
    body: (
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-foreground sm:text-xs">
        <code>{`X-PAYMENT: eyJhbGciOi...middle…truncated…XVCJ9.eyJ…`}</code>
      </pre>
    ),
  },
  {
    title: "200 OK + signed receipt",
    body: (
      <div className="space-y-2">
        <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
          <code>{`HTTP/1.1 200 OK
{ "temp": 32, "city": "mumbai" }
X-PAYMENT-RESPONSE: rec_8f2a…k9q`}</code>
        </pre>
      </div>
    ),
  },
];

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

const receipt = await verifyReceipt(req.headers["x-payment-response"], {
  merchantId: "merch_123"
});

console.log(receipt.amount, receipt.from, receipt.stellarTxHash);`;

const primitives = [
  {
    eyebrow: "01 · Middleware",
    pkg: "@h4rsharma/paykit-x402-middleware",
    blurb: "Turn any route into a paid HTTP endpoint with one wrapper.",
    code: MIDDLEWARE_SAMPLE,
    docsAnchor: "/docs/packages/x402-middleware#paykit-x402-middleware",
  },
  {
    eyebrow: "02 · Agent wallet",
    pkg: "@h4rsharma/paykit-agent-wallet-sdk",
    blurb: "Custodial wallet that signs x402 retries under your policy.",
    code: WALLET_SAMPLE,
    docsAnchor: "/docs/packages/agent-wallet#paykit-agent-wallet-sdk",
  },
  {
    eyebrow: "03 · Receipts",
    pkg: "@h4rsharma/paykit-receipts",
    blurb: "Verify signed receipts your server and buyers can trust.",
    code: RECEIPTS_SAMPLE,
    docsAnchor: "/docs/packages/receipts#paykit-receipts",
  },
] as const;

const quickstartTerminalLines = [
  '# Get a key from Dashboard → API keys, then export it:',
  "export PAYKIT_KEY=pk_test_your_key_here",
  "npm install @h4rsharma/paykit-x402-middleware",
  '# Add paywall() on a route (see docs Quickstart for the full server file)',
  "node server.js   # serves GET /weather with paywall",
  "curl -i http://localhost:3000/weather",
  '# Expect 402 first; agent wallet pays — then 200 + X-PAYMENT-RESPONSE header',
];

function FlowStrip() {
  const reduced = useReducedMotion();

  return (
    <section className="w-full border-y border-border bg-muted/20 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-xl font-semibold tracking-tight md:text-2xl">How a paid request works</h2>
        <div className="mt-10 hidden gap-2 md:flex md:items-stretch md:justify-between">
          {flowSteps.map((step, i) => (
            <div key={step.title} className="flex min-w-0 flex-1 items-stretch gap-2">
              <FlowCard index={i} reduced={reduced} title={step.title}>
                {step.body}
              </FlowCard>
              {i < flowSteps.length - 1 && (
                <div className="flex shrink-0 items-center text-muted-foreground">
                  <ChevronRight className="size-5" aria-hidden />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-4 md:hidden">
          {flowSteps.map((step, i) => (
            <FlowCard key={step.title} index={i} reduced={reduced} title={step.title}>
              {step.body}
            </FlowCard>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
          Under 5 seconds, end to end. The agent stayed within its policy. The receipt is cryptographically verifiable.
        </p>
      </div>
    </section>
  );
}

function FlowCard({
  index,
  reduced,
  title,
  children,
}: {
  index: number;
  reduced: boolean | null;
  title: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      className="min-w-0 flex-1"
      initial={reduced ? false : { opacity: 0, y: 8 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.35, margin: "0px 0px -10% 0px" }}
      transition={{
        duration: 0.3,
        delay: reduced ? 0 : index * 0.15,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="flex h-full flex-col rounded-lg border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className="mt-3 flex-1">{children}</div>
      </div>
    </motion.div>
  );
}

function PrimitivesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
      <h2 className="text-center text-xl font-semibold tracking-tight md:text-2xl">Three primitives. Nothing else.</h2>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {primitives.map((p) => (
          <div
            key={p.pkg}
            className={cn(
              "group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm",
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

function StellarSection() {
  const stats = [
    { value: "~$0.00001", label: "Network fee per transaction" },
    { value: "<5s", label: "End-to-end settlement" },
    { value: "99.99%", label: "Uptime since network launch" },
    { value: "Native", label: "USDC, PYUSD, USDY support" },
  ];
  return (
    <section className="border-y border-border bg-muted/15 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-xl font-semibold tracking-tight md:text-2xl">Why Stellar.</h2>
        <div className="mt-12 grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-mono text-2xl font-medium tracking-tight text-foreground md:text-3xl">{s.value}</p>
              <p className="mt-2 text-xs text-muted-foreground md:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
          x402 only works if fees don&apos;t exceed the payment itself. On Stellar, a $0.001 transaction keeps ~99% of the
          value. On most other networks, it would lose money.
        </p>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center md:py-24">
      <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Ship a paid endpoint in 5 minutes.</h2>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/docs/quickstart"
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
        <TerminalBlock lines={quickstartTerminalLines} minHeight="min-h-[240px]" />
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="text-sm font-semibold text-foreground">PayKit</p>
          <p className="mt-2 text-sm text-muted-foreground">Built on Stellar</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Product</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/docs">
                Documentation
              </Link>
            </li>
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/demo">
                Demo
              </Link>
            </li>
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/dashboard">
                Dashboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Developers</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/playground">
                API playground
              </Link>
            </li>
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/docs/quickstart">
                Quickstart
              </Link>
            </li>
            <li>
              <Link className="text-foreground underline-offset-4 hover:underline" href="/docs/packages">
                Packages
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export function LandingBelowFold() {
  return (
    <>
      <FlowStrip />
      <PrimitivesSection />
      <StellarSection />
      <FinalCta />
      <SiteFooter />
    </>
  );
}