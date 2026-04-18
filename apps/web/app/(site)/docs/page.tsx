import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl flex-1 space-y-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-2 text-muted-foreground">
          PayKit HTTP API — x402 proxy, agent wallets, receipts, webhooks. Authenticate with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">x-api-key</code> or{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">Authorization: Bearer</code>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallets (v1)</CardTitle>
          <CardDescription>Merchant-scoped agent custodial wallets on Stellar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs text-muted-foreground">
          <p>GET /v1/wallets</p>
          <p>POST /v1/wallets</p>
          <p>GET | PATCH /v1/wallets/:id</p>
          <p>POST /v1/wallets/:id/fund · /policy · /sign</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>x402 (v1)</CardTitle>
          <CardDescription>Verify payment headers and settle into receipts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs text-muted-foreground">
          <p>GET /v1/x402/supported</p>
          <p>POST /v1/x402/verify</p>
          <p>POST /v1/x402/settle</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipts & events</CardTitle>
          <CardDescription>Postgres-backed receipts; SSE for your merchant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs text-muted-foreground">
          <p>GET /v1/receipts · GET /v1/receipts/:id</p>
          <p>POST /v1/webhooks · POST /v1/webhooks/:id/replay</p>
          <p>GET /events/stream (text/event-stream)</p>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Deep reference and OpenAPI are planned for Phase 6. See <code className="text-xs">MIGRATION.md</code> in the
        repo for architecture notes.
      </p>
    </div>
  );
}
