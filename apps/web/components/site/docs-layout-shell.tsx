"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { DocsSidebar } from "@/components/site/docs-sidebar";
import { DocsSearchDialog } from "@/components/site/docs-search-dialog";

export function DocsLayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <DocsSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--paykit-border)] bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <Link href="/docs" className="text-sm font-semibold text-foreground">
            Documentation
          </Link>
          <DocsSearchDialog />
        </div>
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">{children}</div>
      </div>
    </div>
  );
}
