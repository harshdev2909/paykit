"use client";

import { useEffect, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useDeveloperAuthStore } from "@/lib/store/developer-auth-store";
import { getAuthMe, listOrganizations, createOrganization } from "@/lib/services/developer-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Key, BookOpen } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function DevelopersContent() {
  const searchParams = useSearchParams();
  const { token, user, setToken, setUser } = useDeveloperAuthStore();

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) {
      setToken(t);
      getAuthMe(t).then(setUser).catch(() => {});
      window.history.replaceState({}, "", "/developers");
    }
  }, [searchParams, setToken, setUser]);

  useEffect(() => {
    if (token && !user) {
      getAuthMe().then(setUser).catch(() => setToken(null));
    }
  }, [token, user, setUser, setToken]);

  if (!token) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-12">
        <h1 className="text-3xl font-bold">Developer Platform</h1>
        <p className="text-muted-foreground">Sign in to manage developer API keys for organizations.</p>
        <a href={`${API_BASE}/auth/google`}>
          <Button variant="outline" className="w-full sm:w-auto">
            Sign in with Google
          </Button>
        </a>
      </div>
    );
  }

  if (!user) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  return <DevelopersOverview user={user} />;
}

function DevelopersOverview({
  user,
}: {
  user: { id: string; email?: string; name?: string; plan: string };
}) {
  const [orgName, setOrgName] = useState("");
  const queryClient = useQueryClient();
  const { data: orgs } = useQuery({
    queryKey: ["developer-orgs"],
    queryFn: listOrganizations,
    enabled: !!useDeveloperAuthStore.getState().token,
  });
  const createOrgMutation = useMutation({
    mutationFn: (name: string) => createOrganization(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["developer-orgs"] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Developer Platform</h1>
        <p className="mt-1 text-muted-foreground">
          Logged in as {user.email ?? user.name ?? user.id} · Plan label: {user.plan} (billing UI removed for pivot)
        </p>
      </div>
      {(!orgs || orgs.length === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Create organization</CardTitle>
            <CardDescription>Create an organization to generate developer API keys (`pk_` prefixed).</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="Organization name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            <Button
              onClick={() => createOrgMutation.mutate(orgName)}
              disabled={!orgName.trim() || createOrgMutation.isPending}
            >
              Create
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/developers/api-keys">
          <Card className="hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">API Keys</CardTitle>
              <Key className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Create and manage hashed API keys per organization.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/developers/docs">
          <Card className="hover:bg-muted/50 transition-colors h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Documentation</CardTitle>
              <BookOpen className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Placeholder until Phase 5 MDX docs.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <DevelopersContent />
    </Suspense>
  );
}
