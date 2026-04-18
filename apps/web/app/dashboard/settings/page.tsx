"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";
import { useDeveloperAuthStore } from "@/lib/store/developer-auth-store";
import { createMerchant } from "@/lib/services/api";
import { listOrganizations, createOrganization } from "@/lib/services/developer-api";
import { useRouter } from "next/navigation";
import { KeyRound, LayoutDashboard, User, LogOut, Plus, Copy } from "lucide-react";

export default function SettingsPage() {
  const { apiKey, setApiKey, clearAuth } = useAuthStore();
  const { user, logout } = useDeveloperAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [inputKey, setInputKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [merchantName, setMerchantName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState("");

  const { data: orgs } = useQuery({
    queryKey: ["developer-orgs"],
    queryFn: listOrganizations,
    enabled: !!useDeveloperAuthStore.getState().token,
  });

  const createMerchantMutation = useMutation({
    mutationFn: (name: string) => createMerchant(name),
    onSuccess: (data) => {
      setApiKey(data.apiKey);
      setGeneratedKey(data.apiKey);
      setMerchantName("");
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: (name: string) => createOrganization(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["developer-orgs"] }),
  });

  const handleSave = () => {
    const key = inputKey.trim();
    if (key) {
      setApiKey(key);
      setSaved(true);
      setTimeout(() => setSaved(false), 2_000);
    }
  };

  const handleClear = () => {
    clearAuth();
    setInputKey("");
    setGeneratedKey(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Account and merchant API key (session memory only)</p>
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <LayoutDashboard className="size-4" />
            Integration checklist
          </CardTitle>
          <CardDescription>
            Link your merchant key below, then return to the dashboard for wallets, receipts, and a step-by-step guide.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard">Open dashboard checklist</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="size-5" />
            Account
          </CardTitle>
          <CardDescription>
            You’re signed in with Google. This account is used to access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm font-medium">{user?.email ?? user?.name ?? "Signed in"}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logout();
              router.push("/dashboard");
            }}
          >
            <LogOut className="size-4 mr-2" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Generate merchant API key
          </CardTitle>
          <CardDescription>Create a merchant record. The key is shown once — copy it before leaving this page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Merchant name"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="max-w-xs"
            />
            <Button
              onClick={() => createMerchantMutation.mutate(merchantName)}
              disabled={!merchantName.trim() || createMerchantMutation.isPending}
            >
              <Plus className="size-4 mr-2" />
              {createMerchantMutation.isPending ? "Creating…" : "Create merchant"}
            </Button>
          </div>
          {generatedKey && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Merchant API key</p>
              <p className="font-mono text-sm break-all">{generatedKey}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                }}
              >
                <Copy className="size-4 mr-2" />
                Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Link merchant API key
          </CardTitle>
          <CardDescription>Paste an existing merchant key for this browser session (not persisted to disk).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            placeholder="pk_test_… or pk_live_…"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            className="font-mono"
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!inputKey.trim()}>
              {saved ? "Saved" : "Use for session"}
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
          {apiKey && (
            <p className="text-sm text-muted-foreground">
              A merchant API key is active in this tab for checkout and wallet API calls.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            Organizations scope developer API keys (OAuth dashboard). Billing tiers removed for this pivot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(!orgs || orgs.length === 0) ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Create an organization to manage developer API keys.</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Organization name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  onClick={() => createOrgMutation.mutate(newOrgName)}
                  disabled={!newOrgName.trim() || createOrgMutation.isPending}
                >
                  {createOrgMutation.isPending ? "Creating…" : "Create organization"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You have {orgs.length} organization(s). Manage keys under{" "}
              <a href="/dashboard/api-keys" className="underline">
                Dashboard → API keys
              </a>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
