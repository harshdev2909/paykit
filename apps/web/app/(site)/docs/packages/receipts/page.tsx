import type { Metadata } from "next";
import Link from "next/link";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";
import { CodeBlock } from "@/components/paykit/code-block";

export const metadata: Metadata = {
  title: "paykit-receipts · PayKit",
  description: "Verify signed PayKit receipts (JWS).",
};

function BetaPill() {
  return (
    <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      Beta
    </span>
  );
}

export default function PackageReceiptsPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 id="paykit-receipts" className="scroll-mt-24 text-3xl font-semibold tracking-tight">
          @h4rsharma/paykit-receipts
          <BetaPill />
        </h1>
        <p className="mt-2 text-muted-foreground">
          <code className="font-mono text-xs">verifyReceipt(signedJws, opts?)</code> validates receipt tokens returned after settle.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold">Install</h2>
        <CodeBlock language="bash" code={`npm install @h4rsharma/paykit-receipts`} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Example</h2>
        <CodeBlock
          language="typescript"
          code={`import { verifyReceipt } from "@h4rsharma/paykit-receipts";

const receipt = await verifyReceipt(res.headers.get("x-payment-response"));
console.log(receipt.amount, receipt.status);`}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold">REST endpoints used</h2>
        <p className="text-sm text-muted-foreground">
          Aligns with{" "}
          <Link href="/docs/rest/receipts" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            GET /v1/receipts
          </Link>{" "}
          rows and settle payloads.
        </p>
      </section>

      <DocsPageFooter docsPathSegment="packages/receipts" />
    </article>
  );
}
