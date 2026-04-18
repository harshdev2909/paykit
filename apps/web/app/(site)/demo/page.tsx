import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-3xl flex-1 space-y-10 px-4 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Demo</h1>
        <p className="mt-2 text-muted-foreground">
          How an HTTP client (including an LLM agent) hits a protected URL, gets an HTTP 402 with payment instructions, pays
          in USDC on Stellar, and receives a normal 200 with a verifiable receipt.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Agent wallet</CardTitle>
            <CardDescription>Create a custodial wallet and policy that your agent uses to sign payment headers.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use <code className="rounded bg-muted px-1 py-0.5 text-xs">POST /v1/wallets</code> with your merchant API key.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2. Verify and settle</CardTitle>
            <CardDescription>Your app asks PayKit to verify a payment, then settle it into a stored receipt.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              See <Link className="text-primary underline-offset-4 hover:underline" href="/docs">the docs</Link> for
              request bodies and headers.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Try the API in your browser</CardTitle>
          <CardDescription>Send real GET and POST requests to PayKit and read the raw response.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/playground">Open playground</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/docs">Read the API reference</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
