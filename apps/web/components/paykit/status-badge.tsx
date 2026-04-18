"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/components/paykit/use-reduced-motion";

export type StatusVariant = "settled" | "pending" | "failed";

export type StatusBadgeProps = {
  status: StatusVariant;
  label?: string;
  className?: string;
};

const copy: Record<StatusVariant, { defaultLabel: string; Icon: typeof CheckCircle2; dot: string; pulse?: boolean }> = {
  settled: {
    defaultLabel: "Settled",
    Icon: CheckCircle2,
    dot: "bg-[var(--paykit-semantic-settled)]",
  },
  pending: {
    defaultLabel: "Pending",
    Icon: Clock,
    dot: "bg-[var(--paykit-semantic-pending)]",
    pulse: true,
  },
  failed: {
    defaultLabel: "Failed",
    Icon: AlertCircle,
    dot: "bg-[var(--paykit-semantic-failed)]",
  },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const reduced = usePrefersReducedMotion();
  const cfg = copy[status];
  const text = label ?? cfg.defaultLabel;
  const Icon = cfg.Icon;
  const pulse = cfg.pulse && !reduced;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-[var(--paykit-border)] bg-card px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-foreground",
        className,
      )}
      role="status"
      aria-label={`Status ${text}`}
    >
      <span
        className={cn("size-2.5 shrink-0 rounded-full", cfg.dot, pulse && "animate-pulse")}
        aria-hidden
      />
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span>{text}</span>
    </span>
  );
}
