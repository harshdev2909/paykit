import * as React from "react";

import { cn } from "@/lib/utils";

export type AmountDisplayProps = {
  /** Human amount, e.g. "0.01" */
  value: string;
  /** Asset code, e.g. USDC, XLM */
  asset: string;
  /** Optional prefix e.g. $ for stablecoins */
  symbol?: string;
  className?: string;
};

export function AmountDisplay({ value, asset, symbol = "$", className }: AmountDisplayProps) {
  return (
    <span className={cn("inline-flex items-baseline gap-1 font-mono text-[13px] tabular-nums text-foreground", className)}>
      <span>
        {symbol}
        {value}
      </span>
      <span className="text-muted-foreground">{asset}</span>
    </span>
  );
}
