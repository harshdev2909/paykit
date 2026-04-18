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

function BetaPill() {
  return (
    <span className="ml-2 inline-flex items-center rounded-md border border-border px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      Beta
    </span>
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
          <CardTitle className="font-mono text-base">
            @h4rsharma/paykit-x402-middleware
            <BetaPill />
          </CardTitle>
          <CardDescription>
            Middleware to protect routes with HTTP 402 and x402 payment flows (Node and Next.js).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Export:</strong> <code className="font-mono text-xs">paywall(opts?)</code>
          </p>
          <p>
            Wrap paid API routes and coordinate with{" "}
            <Link href="/docs" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
              POST /v1/x402/verify
            </Link>{" "}
            and{" "}
            <Link href="/docs" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
              POST /v1/x402/settle
            </Link>{" "}
            on the PayKit API.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">
            @h4rsharma/paykit-agent-wallet-sdk
            <BetaPill />
          </CardTitle>
          <CardDescription>
            Client for custodial agent wallets: create wallet, fetch interceptor, policy hooks.
          </CardDescription>
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
            for creation and signing. Use in browsers or workers to attach policy and payments to outbound HTTP.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">
            @h4rsharma/paykit-receipts
            <BetaPill />
          </CardTitle>
          <CardDescription>Verify signed receipts (JWS) using merchant signing keys.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Export:</strong>{" "}
            <code className="font-mono text-xs">verifyReceipt(signedJws, opts?)</code>
          </p>
          <p>
            Lines up with{" "}
            <Link href="/docs" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
              GET /v1/receipts
            </Link>{" "}
            and the receipt payload from x402 settle.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-2 text-sm text-muted-foreground">
        <h2 className="text-lg font-semibold text-foreground">Versions</h2>
        <p>
          Packages are published on the public npm registry. Check{" "}
          <code className="font-mono text-xs">npm view @h4rsharma/paykit-sdk version</code> for the latest release.
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
