import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingBelowFold } from "@/components/landing";

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="flex min-h-[min(100vh,820px)] flex-col items-center justify-center gap-8 px-6 py-16 text-center md:py-20">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Stellar · x402</p>
          <h1 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            Payments for the agentic web
          </h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            Agent smart wallets, HTTP 402 (x402) settlement, and verifiable receipts on Stellar — one API and a focused
            dashboard.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/demo">View demo</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs">Documentation</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </section>
      <LandingBelowFold />
    </div>
  );
}
