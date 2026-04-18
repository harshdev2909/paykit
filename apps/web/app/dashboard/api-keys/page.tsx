"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDeveloperAuthStore } from "@/lib/store/developer-auth-store";
import { listOrganizations, createApiKey, listApiKeys, deleteApiKey } from "@/lib/services/developer-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Key, Copy, Trash2 } from "lucide-react";

export default function ApiKeysPage() {
  const { token } = useDeveloperAuthStore();
  const [orgId, setOrgId] = useState<string>("");
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: orgs } = useQuery({
    queryKey: ["developer-orgs"],
    queryFn: listOrganizations,
    enabled: !!token,
  });

  const { data: keys, isLoading } = useQuery({
    queryKey: ["developer-apikeys", orgId],
    queryFn: () => listApiKeys(orgId || undefined),
    enabled: !!token && !!orgId,
  });

  useEffect(() => {
    if (orgs?.length && !orgId) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  const createMutation = useMutation({
    mutationFn: () => createApiKey(orgId || undefined, newKeyName || undefined),
    onSuccess: (data) => {
      setCreatedKey(data.key);
      queryClient.invalidateQueries({ queryKey: ["developer-apikeys", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApiKey(id, orgId || undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["developer-apikeys", orgId] }),
  });

  if (!token) {
    return (
      <p className="text-muted-foreground">Sign in to manage API keys.</p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">API keys</h1>
      <p className="text-muted-foreground">Create and manage API keys. Secrets are shown only once when a key is created.</p>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Choose the organization for these keys</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            {orgs?.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
            {(!orgs || orgs.length === 0) && <option value="">Create an organization in Settings first</option>}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-5" /> Keys
            </CardTitle>
            <CardDescription>Keys for this organization</CardDescription>
          </div>
          {orgId && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Create API key</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API key</DialogTitle>
                  <DialogDescription>Optional name. The secret is shown once.</DialogDescription>
                </DialogHeader>
                <Input placeholder="Key name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                {createdKey && (
                  <div className="rounded-lg border bg-muted/30 p-3 font-mono text-sm break-all">
                    <p className="mb-1 text-xs text-muted-foreground">Copy and store securely:</p>
                    {createdKey}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => navigator.clipboard.writeText(createdKey)}
                    >
                      <Copy className="mr-1 size-4" /> Copy
                    </Button>
                  </div>
                )}
                <DialogFooter>
                  {createdKey ? (
                    <Button
                      onClick={() => {
                        setCreatedKey(null);
                        setNewKeyName("");
                      }}
                    >
                      Done
                    </Button>
                  ) : (
                    <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                      Create
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg border border-border bg-muted/40" />
              ))}
            </div>
          ) : keys?.length ? (
            <ul className="space-y-2">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="font-mono text-sm">{k.keyPrefix}…</span>
                  <span className="text-xs text-muted-foreground">{k.name ?? "—"}</span>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(k.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
