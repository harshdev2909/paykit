"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          x402 agent wallets, receipts, and API keys — one place to manage your PayKit integration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Link your merchant API key in Settings to prepare for the new receipts and wallet tabs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard/settings">Settings</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs">Documentation</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/dashboard/api-keys">API keys</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
