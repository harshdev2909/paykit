import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">PayKit</p>
      <h1 className="max-w-lg text-3xl font-semibold tracking-tight md:text-4xl">
        Coming soon
      </h1>
      <p className="max-w-md text-muted-foreground">
        We&apos;re rebuilding as x402 payments infrastructure for the agentic web on Stellar. Full marketing site
        lands in Phase 5.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/developers/docs">Docs placeholder</Link>
        </Button>
      </div>
    </div>
  );
}
