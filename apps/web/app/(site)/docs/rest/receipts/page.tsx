import type { Metadata } from "next";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";
import { ApiKeyRequiredPill } from "@/components/docs/auth-pill";
import { CodeBlock } from "@/components/paykit/code-block";

export const metadata: Metadata = {
  title: "Receipts API · PayKit",
  description: "List and fetch settled receipts for your merchant.",
};

export default function DocsRestReceiptsPage() {
  return (
    <article className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Receipts</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Base path <code className="font-mono text-xs">/v1/receipts</code>. Receipts are stored in Postgres and scoped by merchant API key.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase">GET</span>
          <code className="font-mono text-sm">/v1/receipts</code>
        </div>
        <h2 className="text-base font-semibold">List receipts</h2>
        <ApiKeyRequiredPill required />
        <p className="text-sm text-muted-foreground">
          Query: <code className="font-mono text-xs">limit</code> (1–100, default 20), <code className="font-mono text-xs">offset</code> (default 0).
        </p>
        <CodeBlock
          language="bash"
          code={`curl -sS "$PAYKIT_API_URL/v1/receipts?limit=20&offset=0" \\
  -H "x-api-key: pk_test_..."`}
        />
        <p className="text-sm text-muted-foreground">
          <code className="font-mono text-xs">200</code>: <code className="font-mono text-xs">{`{ "receipts": [ … ] }`}</code>. Rows include fields such as{" "}
          <code className="font-mono text-xs">id</code>, <code className="font-mono text-xs">amount</code>, <code className="font-mono text-xs">asset</code>,{" "}
          <code className="font-mono text-xs">status</code>, <code className="font-mono text-xs">signedReceipt</code>, timestamps, and optional chain hashes.
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase">GET</span>
          <code className="font-mono text-sm">/v1/receipts/:id</code>
        </div>
        <h2 className="text-base font-semibold">Get one receipt</h2>
        <ApiKeyRequiredPill required />
        <p className="text-sm text-muted-foreground">
          <code className="font-mono text-xs">404</code> if the id does not exist for this merchant.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Errors</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <code className="font-mono text-xs">400</code> — invalid query params.
          </li>
          <li>
            <code className="font-mono text-xs">401</code> — missing/invalid API key.
          </li>
          <li>
            <code className="font-mono text-xs">404</code> — receipt not found.
          </li>
          <li>
            <code className="font-mono text-xs">500</code> — server error message in <code className="font-mono text-xs">error</code>.
          </li>
        </ul>
      </section>

      <DocsPageFooter docsPathSegment="rest/receipts" />
    </article>
  );
}
