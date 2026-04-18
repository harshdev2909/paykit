"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, LayoutDashboard, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { onboardingHasExploredApi, onboardingIsDismissed, onboardingSetDismissed } from "@/lib/onboarding/dashboard-onboarding-storage";

type DashboardOnboardingProps = {
  paykitConfigured: boolean;
  apiKeySet: boolean;
  integrationError: boolean;
  /** When false, step 3 stays incomplete until user provisions activity or data loads. */
  hasWalletOrReceipt: boolean;
  integrationReady: boolean;
};

function StepRow({
  done,
  title,
  description,
  action,
}: {
  done: boolean;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3 border-b border-border/80 py-3 last:border-0">
      <span className="mt-0.5 shrink-0 text-muted-foreground">
        {done ? <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden /> : <Circle className="size-5" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className={`text-sm font-medium ${done ? "text-muted-foreground" : ""}`}>{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {action && !done ? <div className="pt-1">{action}</div> : null}
      </div>
    </li>
  );
}

export function DashboardOnboarding({
  paykitConfigured,
  apiKeySet,
  integrationError,
  hasWalletOrReceipt,
  integrationReady,
}: DashboardOnboardingProps) {
  const [hydrated, setHydrated] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const [exploredApi, setExploredApi] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
    setDismissed(onboardingIsDismissed());
    setExploredApi(onboardingHasExploredApi());
  }, []);

  const step1 = paykitConfigured;
  const step2 = apiKeySet;
  const step3 = integrationReady && !integrationError && hasWalletOrReceipt;
  const step4 = exploredApi;

  const allDone = step1 && step2 && step3 && step4;
  const visible = hydrated && !dismissed && !allDone;

  const dismiss = () => {
    onboardingSetDismissed();
    setDismissed(true);
  };

  if (!visible) {
    return null;
  }

  return (
    <Card className="border-[var(--paykit-accent)]/25 bg-gradient-to-br from-[var(--paykit-accent)]/5 to-transparent">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <LayoutDashboard className="size-5" />
            Getting started
          </CardTitle>
          <CardDescription>Finish these steps to see wallets, receipts, and live API traffic in the dashboard.</CardDescription>
        </div>
        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={dismiss} aria-label="Dismiss checklist">
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ol className="list-none space-y-0 divide-y divide-border/60 rounded-lg border border-border bg-card/80 p-1">
          <StepRow
            done={step1}
            title="Point the web app at your PayKit API"
            description="Deploy with the PayKit HTTP API URL in your hosting environment variables (same host your app calls for REST and SSE)."
            action={
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link href="/docs/quickstart">Quickstart →</Link>
              </Button>
            }
          />
          <StepRow
            done={step2}
            title="Link a merchant API key"
            description="Paste pk_test… / pk_live… in Settings so this tab can call /v1/wallets and /v1/receipts (session memory only)."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/settings">Open Settings</Link>
              </Button>
            }
          />
          <StepRow
            done={step3}
            title="Create activity"
            description="Provision an agent wallet or complete a payment so receipts appear on the dashboard."
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/wallet">Wallets</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/demo">Interactive demo</Link>
                </Button>
              </div>
            }
          />
          <StepRow
            done={step4}
            title="Explore the API"
            description="Open the Playground or Interactive demo once — we check this off when you land on either page."
            action={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/playground">Playground</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/demo">Interactive demo</Link>
                </Button>
              </div>
            }
          />
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          Dismiss hides this card in this browser until you clear site data. Completing all steps hides it automatically.
        </p>
      </CardContent>
    </Card>
  );
}
