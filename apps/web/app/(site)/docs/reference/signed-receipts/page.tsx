import type { Metadata } from "next";
import Link from "next/link";

import { DocsPageFooter } from "@/components/docs/docs-page-footer";

export const metadata: Metadata = {
  title: "Signed receipts · PayKit",
  description: "JWS receipts and X-Payment-Response headers.",
};

export default function DocsReferenceSignedReceiptsPage() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Signed receipts</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          After settlement, APIs may return a compact signed payload (JWS) so buyers can audit what was paid without trusting only the merchant&apos;s logs.
          Row storage includes an optional <code className="font-mono text-xs">signedReceipt</code> column in Postgres.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Headers</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <code className="font-mono text-xs">X-PAYMENT</code> — buyer proof on retried requests.
          </li>
          <li>
            <code className="font-mono text-xs">X-PAYMENT-RESPONSE</code> — facilitator or merchant-signed receipt returned on success.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Verification</h2>
        <p className="text-sm text-muted-foreground">
          Use{" "}
          <Link href="/docs/packages/receipts" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            @h4rsharma/paykit-receipts
          </Link>{" "}
          <code className="font-mono text-xs">verifyReceipt</code> or validate against your merchant signing keys published for your account. Align payload
          fields with{" "}
          <Link href="/docs/rest/receipts" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            GET /v1/receipts
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Key material</h2>
        <p className="text-sm text-muted-foreground">
          The API can store Ed25519 public keys (<code className="font-mono text-xs">MerchantReceiptSigningKey</code>) for JWS verification. Rotate keys by
          adding a new <code className="font-mono text-xs">kid</code> before retiring the old private material.
        </p>
      </section>

      <DocsPageFooter docsPathSegment="reference/signed-receipts" />
    </article>
  );
}
