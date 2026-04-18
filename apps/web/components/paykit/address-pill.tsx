"use client";

import * as React from "react";
import { Copy, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { stellarExpertAccountUrl, type StellarNetworkPreset } from "@/lib/stellar-explorer";
import { toast } from "sonner";

function truncateAddress(addr: string, head = 4, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export type AddressPillProps = {
  address: string;
  className?: string;
  network?: StellarNetworkPreset;
  showExplorerLink?: boolean;
};

export function AddressPill({ address, className, network = "testnet", showExplorerLink = true }: AddressPillProps) {
  const truncated = truncateAddress(address);
  const explorer = stellarExpertAccountUrl(address, network);

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    toast.success("Address copied");
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-[var(--paykit-border)] bg-muted/40 px-2 py-1 font-mono text-[12px] text-foreground",
        className,
      )}
    >
      <span className="sr-only">Stellar address {address}</span>
      <span aria-hidden>{truncated}</span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors [transition-duration:var(--duration-micro)] [transition-timing-function:var(--ease-paykit)] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--paykit-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={`Copy full address ${address}`}
      >
        <Copy className="size-3.5" aria-hidden />
      </button>
      {showExplorerLink && (
        <a
          href={explorer}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--paykit-accent)]"
          aria-label={`View ${address} on stellar.expert (opens in new tab)`}
        >
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </span>
  );
}
