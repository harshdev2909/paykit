"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDeveloperAuthStore } from "@/lib/store/developer-auth-store";
import { getAuthMe } from "@/lib/services/developer-api";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export function DashboardAuth({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const { token, user, setToken, setUser } = useDeveloperAuthStore();

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) {
      setToken(t);
      getAuthMe(t).then(setUser).catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams, setToken, setUser]);

  useEffect(() => {
    if (token && !user) {
      getAuthMe().then(setUser).catch(() => setToken(null));
    }
  }, [token, user, setUser, setToken]);

  if (!token) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
        <h2 className="text-2xl font-bold">Sign in to the dashboard</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Use your Google account to access payments, wallet, and settings.
        </p>
        <a href={`${API_BASE}/auth/google?returnTo=dashboard`}>
          <Button size="lg">Sign in with Google</Button>
        </a>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
