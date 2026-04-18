"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FlaskConical, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchAgentWallets,
  fetchReceipts,
  formatPaykitAxiosError,
  paykitApiBaseConfigured,
} from "@/lib/services/paykit-v1";
import { useAuthStore } from "@/lib/store/auth-store";

export default function DashboardPage() {
  const apiKey = useAuthStore((s) => s.apiKey);
  const paykitConfigured = paykitApiBaseConfigured();

  const walletsQuery = useQuery({
    queryKey: ["paykit-wallets"],
    queryFn: fetchAgentWallets,
    enabled: !!apiKey && paykitConfigured,
    staleTime: 30_000,
  });

  const receiptsQuery = useQuery({
    queryKey: ["paykit-receipts", "recent"],
    queryFn: () => fetchReceipts(5, 0),
    enabled: !!apiKey && paykitConfigured,
    staleTime: 30_000,
  });

  const integrationError =
    walletsQuery.isError || receiptsQuery.isError
      ? formatPaykitAxiosError(walletsQuery.error ?? receiptsQuery.error)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Agent wallets, receipts, and API keys — manage your PayKit integration in one place.
        </p>
      </div>

      {!paykitConfigured && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">API URL not configured</CardTitle>
            <CardDescription>
              Set <code className="font-mono text-xs">NEXT_PUBLIC_PAYKIT_API_URL</code> in{" "}
              <code className="font-mono text-xs">apps/web/.env.local</code> to the PayKit HTTP API base (see docs).
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!apiKey && paykitConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-5" />
              Link a merchant API key
            </CardTitle>
            <CardDescription>
              Store your merchant key in this browser session to load wallets and receipts from the PayKit API (memory only — not saved to disk).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/settings">
                Go to Settings
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {apiKey && paykitConfigured && integrationError && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Could not load PayKit data</CardTitle>
            <CardDescription>{integrationError}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/settings">Check API key</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/docs/rest/authentication">Auth docs</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {apiKey && paykitConfigured && !integrationError && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Agent wallets</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {walletsQuery.isLoading ? "—" : walletsQuery.data?.length ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="link" className="h-auto p-0 text-sm" asChild>
                  <Link href="/dashboard/wallet">Manage wallets →</Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Recent receipts</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {receiptsQuery.isLoading ? "—" : receiptsQuery.data?.length ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Last five settled or pending rows.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Try the API</CardDescription>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <FlaskConical className="size-5" />
                  Playground
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/playground">Open Playground</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent receipts</CardTitle>
              <CardDescription>Latest activity for your merchant key.</CardDescription>
            </CardHeader>
            <CardContent>
              {receiptsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : !receiptsQuery.data?.length ? (
                <p className="text-sm text-muted-foreground">
                  No receipts yet. Complete a payment or use the{" "}
                  <Link href="/demo" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
                    interactive demo
                  </Link>
                  .
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 font-medium">
                      <tr>
                        <th className="px-3 py-2">Receipt</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptsQuery.data.map((r) => (
                        <tr key={r.id} className="border-b border-border/80 last:border-0">
                          <td className="px-3 py-2 font-mono text-xs">{r.id.slice(0, 12)}…</td>
                          <td className="px-3 py-2">
                            {r.amount} {r.asset}
                          </td>
                          <td className="px-3 py-2">{r.status}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shortcuts</CardTitle>
          <CardDescription>Configure keys, read the REST reference, or try requests in the playground.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard/settings">Settings</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs/rest/wallets">Wallet API docs</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/api-keys">Developer API keys</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/docs">Documentation</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
