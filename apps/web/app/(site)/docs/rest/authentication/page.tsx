import type { Metadata } from "next";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";
import { ApiKeyRequiredPill } from "@/components/docs/auth-pill";
import { CodeBlock } from "@/components/paykit/code-block";

export const metadata: Metadata = {
  title: "Authentication · PayKit API",
  description: "Merchant API keys via x-api-key or Authorization Bearer.",
};

export default function DocsRestAuthenticationPage() {
  return (
    <article className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Authentication</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Most PayKit REST routes require a merchant API key. Create keys in the dashboard and send them on every request.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Headers</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <code className="font-mono text-xs">x-api-key: &lt;your key&gt;</code>
          </li>
          <li>
            <code className="font-mono text-xs">Authorization: Bearer &lt;your key&gt;</code> — equivalent to{" "}
            <code className="font-mono text-xs">x-api-key</code>.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          Keys look like <code className="font-mono text-xs">pk_test_…</code> or <code className="font-mono text-xs">pk_live_…</code>.
        </p>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium">Any protected route</span>
          <ApiKeyRequiredPill required />
        </div>
        <p className="text-sm text-muted-foreground">
          If the key is missing or invalid, the API responds with <code className="font-mono text-xs">401</code> and a JSON body:
        </p>
        <CodeBlock
          language="json"
          code={`{
  "error": "Missing API key. Provide x-api-key header or Authorization: Bearer <key>."
}`}
        />
        <p className="text-sm text-muted-foreground">
          Unknown keys return <code className="font-mono text-xs">401</code> with <code className="font-mono text-xs">&quot;Invalid API key.&quot;</code>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Example</h2>
        <p className="text-sm text-muted-foreground">
          Replace the host below with your PayKit API origin (your deployment sets this in environment configuration).
        </p>
        <CodeBlock
          language="bash"
          code={`export API_HOST="https://your-api.example"
curl -sS "$API_HOST/v1/wallets" \\
  -H "x-api-key: pk_test_your_key"`}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">CORS</h2>
        <p className="text-sm text-muted-foreground">
          Browser clients must use an origin allowed by the API&apos;s CORS configuration. Allowed request headers include{" "}
          <code className="font-mono text-xs">Content-Type</code>, <code className="font-mono text-xs">Authorization</code>,{" "}
          <code className="font-mono text-xs">x-api-key</code>, and <code className="font-mono text-xs">Idempotency-Key</code>.
        </p>
      </section>

      <DocsPageFooter docsPathSegment="rest/authentication" />
    </article>
  );
}
