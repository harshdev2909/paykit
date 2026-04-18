import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DevelopersDocsPlaceholderPage() {
  return (
    <div className="mx-auto max-w-2xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>
            Single-page docs for x402 middleware, agent wallets, and receipts will ship in Phase 5.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>For now, see the repository README and `MIGRATION.md` after Phase 1.</p>
        </CardContent>
      </Card>
    </div>
  );
}
