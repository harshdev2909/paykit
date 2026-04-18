import type { Metadata } from "next";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";
import { ApiKeyRequiredPill } from "@/components/docs/auth-pill";
import { CodeBlock } from "@/components/paykit/code-block";

export const metadata: Metadata = {
  title: "Events (SSE) · PayKit API",
  description: "Server-sent events stream for merchant-scoped activity.",
};

export default function DocsRestEventsPage() {
  return (
    <article className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Events (SSE)</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Long-lived <code className="font-mono text-xs">text/event-stream</code> connection at <code className="font-mono text-xs">GET /events/stream</code>.
          Requires an API key; events are scoped to the merchant derived from that key.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase">GET</span>
          <code className="font-mono text-sm">/events/stream</code>
        </div>
        <ApiKeyRequiredPill required />
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            First message is a handshake: <code className="font-mono text-xs">{`{ "type": "connected", "merchantId": "…" }`}</code>.
          </li>
          <li>
            Subsequent lines are SSE <code className="font-mono text-xs">data:</code> frames with JSON payloads (for example{" "}
            <code className="font-mono text-xs">receipt.settled</code> broadcasts).
          </li>
          <li>
            Comment lines <code className="font-mono text-xs">: ping</code> arrive every 25s to keep intermediaries from closing the socket.
          </li>
        </ul>
        <CodeBlock
          language="bash"
          code={`curl -N "$PAYKIT_API_URL/events/stream" \\
  -H "x-api-key: pk_test_..."`}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Notes</h2>
        <p className="text-sm text-muted-foreground">
          The hub shares infrastructure with webhook fan-out; ensure your API key is allowed from your deployment&apos;s IP if you terminate TLS at a proxy.
        </p>
      </section>

      <DocsPageFooter docsPathSegment="rest/events" />
    </article>
  );
}
