import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-3xl flex-1 space-y-10 px-4 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Demo</h1>
        <p className="mt-2 text-muted-foreground">
          Walk through x402 payment + receipt flow once the facilitator and wallet UI are wired. This page is a
          stable shell for Phase 6 E2E.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Agent wallet</CardTitle>
            <CardDescription>Create or select an agent wallet via the API or dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">POST /v1/wallets</code> with your merchant key.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2. x402 verify & settle</CardTitle>
            <CardDescription>Proxy verify then settle to mint a receipt row in Postgres.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              See <Link className="text-primary underline-offset-4 hover:underline" href="/docs">docs</Link> for request
              bodies.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interactive runner</CardTitle>
          <CardDescription>Will call your <code className="text-xs">PAYKIT_API_URL</code> from the playground.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/playground">Open playground</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/docs">Read API reference</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
