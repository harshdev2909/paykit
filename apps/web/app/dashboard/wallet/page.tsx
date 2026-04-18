"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createAgentWallet,
  fetchAgentWallets,
  formatPaykitAxiosError,
  fundWallet,
  paykitApiBaseConfigured,
  type PayKitAgentWallet,
} from "@/lib/services/paykit-v1";
import { useAuthStore } from "@/lib/store/auth-store";

function truncateMiddle(s: string, left = 6, right = 4) {
  if (s.length <= left + right + 1) return s;
  return `${s.slice(0, left)}…${s.slice(-right)}`;
}

export default function WalletPage() {
  const apiKey = useAuthStore((s) => s.apiKey);
  const queryClient = useQueryClient();
  const paykitConfigured = paykitApiBaseConfigured();

  const walletsQuery = useQuery({
    queryKey: ["paykit-wallets"],
    queryFn: fetchAgentWallets,
    enabled: !!apiKey && paykitConfigured,
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: () => createAgentWallet(),
    onSuccess: () => {
      toast.success("Agent wallet created.");
      queryClient.invalidateQueries({ queryKey: ["paykit-wallets"] });
    },
    onError: (e) => toast.error(formatPaykitAxiosError(e)),
  });

  const fundMutation = useMutation({
    mutationFn: (walletId: string) => fundWallet(walletId),
    onSuccess: () => {
      toast.success("Funding requested (testnet faucet).");
      queryClient.invalidateQueries({ queryKey: ["paykit-wallets"] });
    },
    onError: (e) => toast.error(formatPaykitAxiosError(e)),
  });

  const wallets = walletsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
          <p className="mt-1 max-w-xl text-muted-foreground">
            Soroban agent wallets for x402 spends. Uses your linked merchant API key (
            <Link href="/dashboard/settings" className="underline underline-offset-2">
              Settings
            </Link>
            ).
          </p>
        </div>
        <Button
          disabled={!apiKey || !paykitConfigured || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? "Creating…" : "Create agent wallet"}
        </Button>
      </div>

      {!paykitConfigured && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">API URL not configured</CardTitle>
            <CardDescription>
              Add <code className="font-mono text-xs">NEXT_PUBLIC_PAYKIT_API_URL</code> to{" "}
              <code className="font-mono text-xs">.env.local</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {paykitConfigured && !apiKey && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No merchant API key</CardTitle>
            <CardDescription>Paste or generate a key in Settings to list and create wallets.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/settings">Open Settings</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {apiKey && paykitConfigured && walletsQuery.isError && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load wallets</CardTitle>
            <CardDescription>{formatPaykitAxiosError(walletsQuery.error)}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {apiKey && paykitConfigured && walletsQuery.isSuccess && (
        <Card>
          <CardHeader>
            <CardTitle>Agent wallets</CardTitle>
            <CardDescription>
              {wallets.length === 0 ? "Create a wallet to get a custodial signing key on Stellar testnet." : `${wallets.length} wallet(s).`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {walletsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : wallets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No wallets yet — use the button above to provision one.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 font-medium">
                    <tr>
                      <th className="px-3 py-2">Public key</th>
                      <th className="px-3 py-2">Policy</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.map((w: PayKitAgentWallet) => (
                      <tr key={w.id} className="border-b border-border/80 last:border-0">
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs" title={w.publicKey}>
                            {truncateMiddle(w.publicKey, 8, 6)}
                          </span>
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground" title={JSON.stringify(w.agentPolicy ?? {})}>
                          {w.agentPolicy && Object.keys(w.agentPolicy).length > 0 ? JSON.stringify(w.agentPolicy) : "—"}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                          {new Date(w.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              aria-label="Copy wallet id"
                              onClick={() => {
                                navigator.clipboard.writeText(w.id);
                                toast.success("Wallet id copied");
                              }}
                            >
                              <Copy className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={fundMutation.isPending && fundMutation.variables === w.id}
                              onClick={() => fundMutation.mutate(w.id)}
                            >
                              <RefreshCw className="mr-1 size-3.5" />
                              Fund
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
