import type { Metadata } from "next";
import Link from "next/link";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";
import { CodeBlock } from "@/components/paykit/code-block";
import { ApiKeyRequiredPill } from "@/components/docs/auth-pill";

export const metadata: Metadata = {
  title: "paykit-x402-middleware · PayKit",
  description: "Express paywall middleware for HTTP 402 and Stellar x402.",
};

function BetaPill() {
  return (
    <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      Beta
    </span>
  );
}

export default function PackageX402MiddlewarePage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 id="paykit-x402-middleware" className="scroll-mt-24 text-3xl font-semibold tracking-tight">
          @h4rsharma/paykit-x402-middleware
          <BetaPill />
        </h1>
        <p className="mt-2 text-muted-foreground">
          Middleware to protect routes with HTTP 402 and PayKit facilitator calls. Pair with{" "}
          <Link href="/docs/rest/x402" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            POST /v1/x402/verify
          </Link>{" "}
          and{" "}
          <Link href="/docs/rest/x402" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            POST /v1/x402/settle
          </Link>
          .
        </p>
      </header>

      <section>
        <h2 className="text-lg font-semibold">Install</h2>
        <CodeBlock language="bash" code={`npm install @h4rsharma/paykit-x402-middleware`} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">paywall(opts?)</h2>
        <p className="text-sm text-muted-foreground">
          Returns Express middleware. Pass your merchant API key and network when wiring the facilitator.
        </p>
        <CodeBlock
          language="typescript"
          code={`import { paywall } from "@h4rsharma/paykit-x402-middleware";

app.get("/resource", paywall({ price: "0.01", asset: "USDC", apiKey: process.env.PAYKIT_KEY }), handler);`}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold">REST endpoints used</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <ApiKeyRequiredPill required />{" "}
            <Link className="text-[var(--paykit-accent)] underline-offset-2 hover:underline" href="/docs/rest/x402">
              x402 verify & settle
            </Link>
          </li>
        </ul>
      </section>

      <DocsPageFooter docsPathSegment="packages/x402-middleware" />
    </article>
  );
}
