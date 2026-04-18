"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <p className="font-mono text-xs uppercase tracking-wider text-destructive">Error</p>
      <h1 className="max-w-md text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        This page hit an unexpected error. Try again or return home.
      </p>
      {process.env.NODE_ENV === "development" ? (
        <pre className="max-h-[120px] max-w-full overflow-auto rounded-md border border-border bg-muted/40 p-3 text-left font-mono text-xs text-muted-foreground">
          {error.message}
        </pre>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
