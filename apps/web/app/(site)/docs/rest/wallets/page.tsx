import type { Metadata } from "next";
import type { ReactNode } from "react";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";
import { ApiKeyRequiredPill } from "@/components/docs/auth-pill";
import { CodeBlock } from "@/components/paykit/code-block";

export const metadata: Metadata = {
  title: "Wallets API · PayKit",
  description: "Create and manage custodial agent wallets: policy, fund, sign.",
};

function Endpoint({
  method,
  path,
  title,
  children,
}: {
  method: string;
  path: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase">{method}</span>
        <code className="font-mono text-sm">{path}</code>
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <ApiKeyRequiredPill required />
      {children}
    </section>
  );
}

export default function DocsRestWalletsPage() {
  return (
    <article className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Wallets</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Base path <code className="font-mono text-xs">/v1/wallets</code>. All routes require an API key and are scoped to the merchant
          owning that key.
        </p>
      </header>

      <Endpoint method="GET" path="/v1/wallets" title="List wallets">
        <p className="text-sm text-muted-foreground">
          Returns <code className="font-mono text-xs">{`{ "wallets": [...] }`}</code>.
        </p>
        <CodeBlock
          language="bash"
          code={`curl -sS "$API_HOST/v1/wallets" -H "x-api-key: pk_test_..."`}
        />
      </Endpoint>

      <Endpoint method="POST" path="/v1/wallets" title="Create wallet">
        <p className="text-sm text-muted-foreground">
          Optional JSON body with <code className="font-mono text-xs">agentPolicy</code> object. Response <code className="font-mono text-xs">201</code> with the new wallet row.
        </p>
        <CodeBlock
          language="json"
          code={`{
  "agentPolicy": {
    "dailyCap": "10.00",
    "allowedDomains": ["api.example.com"]
  }
}`}
        />
      </Endpoint>

      <Endpoint method="GET" path="/v1/wallets/:id" title="Get wallet">
        <p className="text-sm text-muted-foreground">
          Full wallet record including balances when available. <code className="font-mono text-xs">404</code> if not found for this merchant.
        </p>
      </Endpoint>

      <Endpoint method="PATCH" path="/v1/wallets/:id" title="Replace agent policy">
        <p className="text-sm text-muted-foreground">Body must include <code className="font-mono text-xs">agentPolicy</code> (object).</p>
        <CodeBlock
          language="json"
          code={`{
  "agentPolicy": { "dailyCap": "5.00" }
}`}
        />
      </Endpoint>

      <Endpoint method="POST" path="/v1/wallets/:id/policy" title="Merge policy (POST)">
        <p className="text-sm text-muted-foreground">
          JSON object merged into the existing policy (same shape as <code className="font-mono text-xs">agentPolicy</code>).
        </p>
      </Endpoint>

      <Endpoint method="POST" path="/v1/wallets/:id/fund" title="Fund wallet">
        <p className="text-sm text-muted-foreground">
          Triggers funding for the custodial wallet. Returns <code className="font-mono text-xs">{`{ "ok": true }`}</code> or an error (e.g.{" "}
          <code className="font-mono text-xs">404</code>).
        </p>
      </Endpoint>

      <Endpoint method="POST" path="/v1/wallets/:id/sign" title="Sign hex message">
        <p className="text-sm text-muted-foreground">
          Body: <code className="font-mono text-xs">{`{ "messageHex": "..." }`}</code>. Response includes{" "}
          <code className="font-mono text-xs">signature</code> (hex) and <code className="font-mono text-xs">scheme: "ed25519"</code>.
        </p>
        <CodeBlock
          language="json"
          code={`{
  "messageHex": "deadbeef"
}`}
        />
      </Endpoint>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Errors</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <code className="font-mono text-xs">400</code> — validation (<code className="font-mono text-xs">error</code> may be a Zod flatten object).
          </li>
          <li>
            <code className="font-mono text-xs">404</code> — wallet not found for merchant.
          </li>
          <li>
            <code className="font-mono text-xs">500</code> — <code className="font-mono text-xs">{`{ "error": "message" }`}</code>.
          </li>
        </ul>
      </section>

      <DocsPageFooter docsPathSegment="rest/wallets" />
    </article>
  );
}
