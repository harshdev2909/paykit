import type { Metadata } from "next";
import Link from "next/link";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";
import { CodeBlock } from "@/components/paykit/code-block";

export const metadata: Metadata = {
  title: "Spending policies · PayKit",
  description: "Agent wallet policy JSON for custodial spends.",
};

export default function DocsReferenceSpendingPoliciesPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Spending policies</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Custodial agent wallets attach an <code className="font-mono text-xs">agentPolicy</code> JSON object. The exact schema is intentionally flexible;
          middleware and facilitator layers should enforce caps and domain allowlists before submitting Stellar legs.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Suggested fields</h2>
        <CodeBlock
          language="json"
          code={`{
  "dailyCap": "10.00",
  "allowedDomains": ["api.partner.com", "merchant.example"],
  "allowedAssets": ["USDC"],
  "maxSinglePayment": "2.00"
}`}
        />
        <p className="text-sm text-muted-foreground">
          Store amounts as decimal strings to match ledger and HTTP APIs. Combine with{" "}
          <Link href="/docs/rest/wallets" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            PATCH /v1/wallets/:id
          </Link>{" "}
          or{" "}
          <Link href="/docs/rest/wallets" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            POST /v1/wallets/:id/policy
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Enforcement</h2>
        <p className="text-sm text-muted-foreground">
          PayKit persists the policy with the wallet record. Runtime enforcement happens in your integration (middleware rejecting 402 retries, facilitator
          refusing settle if policy would be violated). Surface meaningful errors to the agent so it can request user approval or a higher cap.
        </p>
      </section>

      <DocsPageFooter docsPathSegment="reference/spending-policies" />
    </article>
  );
}
