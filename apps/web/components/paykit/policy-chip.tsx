import * as React from "react";

import { cn } from "@/lib/utils";

export type PolicyChipProps = {
  children: React.ReactNode;
  className?: string;
};

export function PolicyChip({ children, className }: PolicyChipProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border border-[var(--paykit-border)] bg-transparent px-2.5 py-1 font-mono text-[11px] leading-tight text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
