import type { Metadata } from "next";

import { ThemeToggle } from "@/components/paykit/theme-toggle";
import Link from "next/link";
import { PrimitivesShowcase } from "./primitives-showcase";

export const metadata: Metadata = {
  title: "Components · PayKit",
  description: "Internal design system and primitive previews.",
  robots: { index: false, follow: false },
};

/**
 * Next.js treats folders starting with `_` as private (not routable), so this lab lives at `/dev/components`.
 * Spec referenced `/_dev/components`; use this route instead.
 */
export default function DevComponentsPage() {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--paykit-border)] bg-background/80 px-6 py-3 backdrop-blur-md md:px-12">
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="font-mono text-[12px] text-muted-foreground [transition-duration:var(--duration-standard)] [transition-timing-function:var(--ease-paykit)] hover:text-foreground"
          >
            ← paykit
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">/dev/components</span>
        </div>
        <ThemeToggle />
      </div>
      <PrimitivesShowcase />
    </>
  );
}
