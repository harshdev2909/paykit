import type { Metadata } from "next";
import Link from "next/link";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";

export const metadata: Metadata = {
  title: "What is x402? · PayKit",
  description: "HTTP 402 Payment Required as a programmable payment challenge for APIs.",
};

export default function WhatIsX402Page() {
  return (
    <article className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">What is x402?</h1>
        <p className="mt-2 text-muted-foreground">
          x402 repurposes HTTP <code className="font-mono text-sm">402 Payment Required</code> so an API can return a structured
          challenge: which network, asset, amount, and destination should be paid before the response body is released.
        </p>
      </div>
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
        <li>
          <span className="text-foreground">Client requests a URL</span> — without payment, your route returns{" "}
          <code className="font-mono text-xs">402</code> and hints in headers and JSON.
        </li>
        <li>
          <span className="text-foreground">Buyer pays</span> — on Stellar through PayKit, USDC legs settle in seconds on testnet or mainnet.
        </li>
        <li>
          <span className="text-foreground">Client retries</span> — with an <code className="font-mono text-xs">X-PAYMENT</code> header
          your facilitator can verify.
        </li>
        <li>
          <span className="text-foreground">Server responds</span> — <code className="font-mono text-xs">200 OK</code> plus an{" "}
          <code className="font-mono text-xs">X-PAYMENT-RESPONSE</code> receipt your buyer can audit.
        </li>
      </ol>
      <p className="text-sm text-muted-foreground">
        Next:{" "}
        <Link href="/docs/quickstart" className="font-medium text-[var(--paykit-accent)] underline-offset-2 hover:underline">
          Quickstart →
        </Link>
      </p>
      <DocsPageFooter docsPathSegment="what-is-x402" />
    </article>
  );
}
