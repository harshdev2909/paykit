"use client";

import * as React from "react";
import { Copy, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AddressPill } from "@/components/paykit/address-pill";
import { AmountDisplay } from "@/components/paykit/amount-display";
import { StatusBadge, type StatusVariant } from "@/components/paykit/status-badge";
import { Button } from "@/components/ui/button";
import { stellarExpertTxUrl, type StellarNetworkPreset } from "@/lib/stellar-explorer";

export type ReceiptCardProps = {
  fromAddress: string;
  toAddress: string;
  amount: string;
  asset: string;
  domain: string;
  path: string;
  txHash: string;
  status: StatusVariant;
  createdAt: Date | string;
  signedReceiptPreview?: string;
  onReplayWebhook?: () => void;
  network?: StellarNetworkPreset;
  className?: string;
};

function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().replace("T", " ").slice(0, 19);
}

export function ReceiptCard({
  fromAddress,
  toAddress,
  amount,
  asset,
  domain,
  path,
  txHash,
  status,
  createdAt,
  signedReceiptPreview,
  onReplayWebhook,
  network = "testnet",
  className,
}: ReceiptCardProps) {
  const jws = signedReceiptPreview ?? "eyJhbGciOi…truncated";

  const copyJws = async () => {
    if (signedReceiptPreview) {
      await navigator.clipboard.writeText(signedReceiptPreview);
      toast.success("Signed JWS copied");
    } else {
      toast.message("No full JWS in this preview");
    }
  };

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--paykit-border)] bg-card p-4 text-[13px] leading-snug",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <StatusBadge status={status} />
        <time className="font-mono text-[11px] text-muted-foreground" dateTime={typeof createdAt === "string" ? createdAt : createdAt.toISOString()}>
          {formatTime(createdAt)}
        </time>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">From</p>
          <AddressPill address={fromAddress} network={network} />
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">To</p>
          <AddressPill address={toAddress} network={network} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Amount</p>
          <AmountDisplay value={amount} asset={asset} />
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Resource</p>
          <p className="font-mono text-[12px]">
            {domain}
            {path}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Stellar tx</p>
        <a
          href={stellarExpertTxUrl(txHash, network)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block font-mono text-[12px] text-[var(--paykit-accent)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--paykit-accent)]"
        >
          {txHash.length > 16 ? `${txHash.slice(0, 8)}…${txHash.slice(-6)}` : txHash}
        </a>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="font-mono text-xs" onClick={copyJws}>
          <Copy className="size-3.5" aria-hidden />
          Copy signed JWS
        </Button>
        {onReplayWebhook && (
          <Button type="button" variant="outline" size="sm" className="font-mono text-xs" onClick={onReplayWebhook}>
            <RotateCcw className="size-3.5" aria-hidden />
            Replay webhook
          </Button>
        )}
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">Preview: {jws}</p>
    </article>
  );
}
