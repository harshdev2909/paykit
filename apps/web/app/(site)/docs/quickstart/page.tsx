import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quickstart · PayKit",
  description: "Ship a paid API endpoint in 5 minutes.",
};

export default function QuickstartPage() {
  return (
    <div className="mx-auto max-w-3xl flex-1 space-y-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Quickstart</h1>
        <p className="mt-2 text-muted-foreground">Ship a paid API endpoint in 5 minutes.</p>
      </div>
      <ol className="list-decimal space-y-4 pl-5 text-sm leading-relaxed text-muted-foreground">
        <li>
          <span className="text-foreground">Get an API key</span> from{" "}
          <Link
            href="/dashboard/api-keys"
            className="font-medium text-[var(--paykit-accent)] underline-offset-2 hover:underline"
          >
            Dashboard → API keys
          </Link>
          . Keys look like <code className="rounded bg-muted px-1 py-0.5 text-xs">pk_test_…</code> or{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">pk_live_…</code>.
        </li>
        <li>
          <span className="text-foreground">Install the middleware</span> package:{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm install @h4rsharma/paykit-x402-middleware</code>
        </li>
        <li>
          <span className="text-foreground">Protect a route</span> with <code className="rounded bg-muted px-1 py-0.5 text-xs">paywall()</code>. Copy a
          full example from the{" "}
          <Link href="/docs/sdk" className="font-medium text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            JavaScript SDK
          </Link>{" "}
          page.
        </li>
        <li>
          <span className="text-foreground">Test with curl</span>: <code className="rounded bg-muted px-1 py-0.5 text-xs">curl -i</code> your URL;
          you should get <code className="rounded bg-muted px-1 py-0.5 text-xs">402</code> and payment instructions before a paid retry returns{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">200</code> with an <code className="rounded bg-muted px-1 py-0.5 text-xs">X-PAYMENT-RESPONSE</code>{" "}
          header.
        </li>
        <li>
          <span className="text-foreground">Agent wallet and receipt verification</span> use{" "}
          <Link href="/docs/sdk" className="font-medium text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            @h4rsharma/paykit-agent-wallet-sdk
          </Link>{" "}
          and{" "}
          <Link href="/docs/sdk" className="font-medium text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            @h4rsharma/paykit-receipts
          </Link>
          .
        </li>
      </ol>
      <p className="text-sm text-muted-foreground">
        <Link href="/docs" className="font-medium text-[var(--paykit-accent)] underline-offset-2 hover:underline">
          HTTP API reference
        </Link>
        {" — every endpoint, request, and example."}
      </p>
    </div>
  );
}
