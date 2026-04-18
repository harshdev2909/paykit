import type { Metadata } from "next";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";
import { ApiKeyRequiredPill } from "@/components/docs/auth-pill";
import { CodeBlock } from "@/components/paykit/code-block";

export const metadata: Metadata = {
  title: "Webhooks API · PayKit",
  description: "Register outbound HTTPS webhooks and replay delivery.",
};

export default function DocsRestWebhooksPage() {
  return (
    <article className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Webhooks</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Base path <code className="font-mono text-xs">/v1/webhooks</code>. Subscriptions are stored in MongoDB and tied to your merchant id.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase">POST</span>
          <code className="font-mono text-sm">/v1/webhooks</code>
        </div>
        <h2 className="text-base font-semibold">Register subscription</h2>
        <ApiKeyRequiredPill required />
        <CodeBlock
          language="json"
          code={`{
  "url": "https://example.com/paykit-hook",
  "events": ["receipt.settled", "x402.verified"],
  "secret": "optional-hmac-secret"
}`}
        />
        <p className="text-sm text-muted-foreground">
          Allowed <code className="font-mono text-xs">events</code> values include:{" "}
          <code className="font-mono text-xs">payment.completed</code>, <code className="font-mono text-xs">payment.created</code>,{" "}
          <code className="font-mono text-xs">payment.failed</code>, <code className="font-mono text-xs">wallet.created</code>,{" "}
          <code className="font-mono text-xs">checkout.completed</code>, <code className="font-mono text-xs">checkout.failed</code>,{" "}
          <code className="font-mono text-xs">receipt.settled</code>, <code className="font-mono text-xs">x402.verified</code>.
        </p>
        <p className="text-sm text-muted-foreground">
          <code className="font-mono text-xs">201</code>: subscription id, url, events, active flag, createdAt.
        </p>
        <p className="text-sm text-muted-foreground">
          <code className="font-mono text-xs">400</code> if any event name is not in the supported list (response includes <code className="font-mono text-xs">supported</code> array).
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase">POST</span>
          <code className="font-mono text-sm">/v1/webhooks/:id/replay</code>
        </div>
        <h2 className="text-base font-semibold">Replay last receipt</h2>
        <ApiKeyRequiredPill required />
        <p className="text-sm text-muted-foreground">
          <code className="font-mono text-xs">:id</code> is the MongoDB subscription <code className="font-mono text-xs">_id</code>. Sends a live{" "}
          <code className="font-mono text-xs">receipt.settled</code>-shaped payload to your URL for the most recent receipt (used for debugging).
        </p>
        <p className="text-sm text-muted-foreground">
          <code className="font-mono text-xs">400</code> invalid id, <code className="font-mono text-xs">404</code> subscription or no receipts,{" "}
          <code className="font-mono text-xs">200</code> <code className="font-mono text-xs">{`{ "ok", "status" }`}</code> from the HTTP call to your endpoint.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Errors</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <code className="font-mono text-xs">401</code> — API key.
          </li>
          <li>
            <code className="font-mono text-xs">500</code> — registration or delivery failure.
          </li>
        </ul>
      </section>

      <DocsPageFooter docsPathSegment="rest/webhooks" />
    </article>
  );
}
