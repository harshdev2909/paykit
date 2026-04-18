import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocsPageFooter } from "@/components/docs/docs-page-footer";

export const metadata: Metadata = {
  title: "Documentation · PayKit",
  description: "Ship paid HTTP APIs with x402, agent wallets on Stellar, and verifiable receipts.",
};

export default function DocsHomePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          PayKit REST API v1 covers agent wallets, x402 verify/settle, receipts in Postgres, webhooks, and server-sent events.
          Authenticate with <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">x-api-key</code> or{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">Authorization: Bearer</code>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/docs/quickstart">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">Quickstart</CardTitle>
              <CardDescription>Install middleware, protect a route, curl 402, pay, verify receipt.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/docs/rest/authentication">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">REST API</CardTitle>
              <CardDescription>Endpoint-by-endpoint reference with bodies, examples, and errors.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/docs/packages">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">Packages</CardTitle>
              <CardDescription>npm libraries for middleware, agent wallet, and receipt verification.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/docs/what-is-x402">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle className="text-base">What is x402?</CardTitle>
              <CardDescription>HTTP 402 as a machine-readable payment challenge for APIs.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <DocsPageFooter docsPathSegment="" />
    </div>
  );
}
