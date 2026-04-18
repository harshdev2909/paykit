import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-[var(--paykit-border)] bg-card/50 px-6 py-12 text-center",
        className,
      )}
      role="status"
    >
      <div className="flex size-12 items-center justify-center rounded-lg border border-[var(--paykit-border)] text-muted-foreground">
        <Icon className="size-6" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-base font-medium tracking-tight text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
