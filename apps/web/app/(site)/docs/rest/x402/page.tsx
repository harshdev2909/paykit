import type { Metadata } from "next";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";
import { ApiKeyRequiredPill } from "@/components/docs/auth-pill";
import { CodeBlock } from "@/components/paykit/code-block";

export const metadata: Metadata = {
  title: "x402 API · PayKit",
  description: "Verify X-Payment headers and record settlements.",
};

export default function DocsRestX402Page() {
  return (
    <article className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">x402</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Base path <code className="font-mono text-xs">/v1/x402</code>. Use with HTTP 402 flows and the paywall middleware packages.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase">GET</span>
          <code className="font-mono text-sm">/v1/x402/supported</code>
        </div>
        <h2 className="text-base font-semibold">Supported networks &amp; assets</h2>
        <ApiKeyRequiredPill required={false} />
        <p className="text-sm text-muted-foreground">Public catalog for clients configuring paywalls (cached on the server).</p>
        <CodeBlock language="bash" code={`curl -sS "$PAYKIT_API_URL/v1/x402/supported"`} />
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase">POST</span>
          <code className="font-mono text-sm">/v1/x402/verify</code>
        </div>
        <h2 className="text-base font-semibold">Verify payment header</h2>
        <ApiKeyRequiredPill required />
        <p className="text-sm text-muted-foreground">
          Checks that the payment header is non-empty and plausibly encoded (base64 or <code className="font-mono text-xs">0x</code> hex). Emits a
          webhook event <code className="font-mono text-xs">x402.verified</code> for observability.
        </p>
        <CodeBlock
          language="json"
          code={`{
  "paymentHeader": "<base64 or 0x…>",
  "resource": "https://merchant.example/resource",
  "domain": "merchant.example"
}`}
        />
        <p className="text-sm text-muted-foreground">
          <code className="font-mono text-xs">200</code>: <code className="font-mono text-xs">{`{ "valid": boolean, "details": { ... } }`}</code>.
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase">POST</span>
          <code className="font-mono text-sm">/v1/x402/settle</code>
        </div>
        <h2 className="text-base font-semibold">Record settlement</h2>
        <ApiKeyRequiredPill required />
        <p className="text-sm text-muted-foreground">
          Persists a settled receipt row in Postgres. Optional fields attach ledger references and a signed receipt JWS string.
        </p>
        <CodeBlock
          language="json"
          code={`{
  "walletFrom": "G…",
  "walletTo": "G…",
  "asset": "USDC",
  "amount": "1.25",
  "domain": "api.example.com",
  "path": "/premium/data",
  "x402Nonce": "…",
  "facilitatorTxHash": "…",
  "stellarTxHash": "…",
  "signedReceipt": "<JWS>"
}`}
        />
        <p className="text-sm text-muted-foreground">
          <code className="font-mono text-xs">201</code>: <code className="font-mono text-xs">{`{ "id", "status", "createdAt" }`}</code>. May enqueue{" "}
          <code className="font-mono text-xs">receipt.settled</code> webhooks and SSE events.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Errors</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <code className="font-mono text-xs">400</code> — body validation.
          </li>
          <li>
            <code className="font-mono text-xs">401</code> — missing/invalid API key on protected routes.
          </li>
          <li>
            <code className="font-mono text-xs">500</code> — <code className="font-mono text-xs">{`{ "error": "…" }`}</code>.
          </li>
        </ul>
      </section>

      <DocsPageFooter docsPathSegment="rest/x402" />
    </article>
  );
}
