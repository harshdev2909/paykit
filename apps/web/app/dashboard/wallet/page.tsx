"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WalletPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="mt-1 text-muted-foreground">
          Lists your agent wallets and spending policy. For hosted checkout, use the links from your dashboard settings.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Placeholder</CardTitle>
          <CardDescription>
            This page will list Soroban agent wallets and policy state.{" "}
            <Link href="/dashboard/settings" className="underline">
              Settings
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
