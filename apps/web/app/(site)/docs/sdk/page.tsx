import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "JavaScript SDK · PayKit",
  description:
    "npm packages for x402 middleware, agent wallet client, and receipt verification. Aggregator @h4rsharma/paykit-sdk.",
};

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg border border-[var(--paykit-border)] bg-[var(--paykit-code-bg)] p-4 font-mono text-[12px] leading-relaxed text-foreground">
      <code>{children}</code>
    </pre>
  );
}

export default function SdkDocsPage() {
  return (
    <div className="mx-auto max-w-3xl flex-1 space-y-10 px-4 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">JavaScript / TypeScript SDK</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          PayKit ships four npm packages under the <code className="font-mono text-xs text-foreground">@h4rsharma</code>{" "}
          scope: a thin aggregator and three libraries for x402 middleware, agent wallets, and signed receipts. Install the
          aggregator to pull all three, or install packages individually.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Install</h2>
        <p className="text-sm text-muted-foreground">
          Requires Node 18+. Use your registry of choice (
          <abbr title="Node Package Manager" className="cursor-help no-underline">
            npm
          </abbr>
          , pnpm, yarn).
        </p>
        <Code>{`npm install @h4rsharma/paykit-sdk

# or install only what you need:
npm install @h4rsharma/paykit-x402-middleware
npm install @h4rsharma/paykit-agent-wallet-sdk
npm install @h4rsharma/paykit-receipts`}</Code>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Aggregator — @h4rsharma/paykit-sdk</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Re-exports everything from the three packages so you have a single dependency during integration.
        </p>
        <Code>{`import { paywall, createAgentWallet, verifyReceipt } from "@h4rsharma/paykit-sdk";`}</Code>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">@h4rsharma/paykit-x402-middleware</CardTitle>
          <CardDescription>
            Express / Next.js middleware to protect routes with HTTP 402 and x402 payment flows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Export:</strong> <code className="font-mono text-xs">paywall(opts?)</code>
          </p>
          <p>
            Intended use: wrap paid API routes; verify facilitator payloads; align with{" "}
            <Link href="/docs" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
              POST /v1/x402/verify
            </Link>{" "}
            and{" "}
            <Link href="/docs" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
              POST /v1/x402/settle
            </Link>{" "}
            on the PayKit API.
          </p>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
            <strong className="font-medium">Status:</strong> the published API currently throws at runtime with a clear
            &quot;not implemented&quot; message — types and package boundaries are stable; implementation is scheduled
            alongside the middleware design in-repo.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">@h4rsharma/paykit-agent-wallet-sdk</CardTitle>
          <CardDescription>Client helpers for custodial agent wallets: create wallet, fetch interceptor, policy hooks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Export:</strong>{" "}
            <code className="font-mono text-xs">createAgentWallet(opts?)</code>
          </p>
          <p>
            Works with{" "}
            <Link href="/docs" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
              /v1/wallets
            </Link>{" "}
            (server-side wallet creation and signing). The SDK is meant for browser or worker runtimes that attach policy
            and payment behavior to outbound HTTP.
          </p>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
            <strong className="font-medium">Status:</strong> stub — calls throw until the interceptor and policy API are
            implemented.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">@h4rsharma/paykit-receipts</CardTitle>
          <CardDescription>Verify signed receipts (JWS) and optional JWKS for merchant receipt signing keys.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Export:</strong>{" "}
            <code className="font-mono text-xs">verifyReceipt(signedJws, opts?)</code>
          </p>
          <p>
            Aligns with receipt payloads from{" "}
            <Link href="/docs" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
              GET /v1/receipts
            </Link>{" "}
            and fields stored when calling x402 settle.
          </p>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
            <strong className="font-medium">Status:</strong> stub — verification logic will validate JWS against
            published keys (see Postgres <code className="font-mono text-xs">merchant_receipt_signing_keys</code> in the
            API).
          </p>
        </CardContent>
      </Card>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Source & versions</h2>
        <p>
          Packages live under <code className="font-mono text-xs">packages/</code> in the PayKit monorepo. Published
          versions track together via Changesets; check{" "}
          <code className="font-mono text-xs">npm view @h4rsharma/paykit-sdk version</code> for the latest.
        </p>
        <p>
          REST reference: <Link href="/docs" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">HTTP API</Link>
          {" · "}
          Try requests: <Link href="/playground" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">Playground</Link>
        </p>
      </section>
    </div>
  );
}
