"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

export interface CheckoutSessionData {
  amount: string;
  asset: string;
  walletAddress: string;
  description?: string;
}

export function CheckoutForm({ session }: { session: CheckoutSessionData }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(session.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm font-medium text-muted-foreground">Amount</p>
        <p className="text-2xl font-bold">
          {session.amount} {session.asset}
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium text-muted-foreground">Scan or copy address</p>
        <QRCodeSVG value={session.walletAddress} size={180} level="M" className="rounded-lg bg-white p-2" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Stellar address</p>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background p-3 font-mono text-sm break-all">
          {session.walletAddress}
          <Button variant="ghost" size="icon" className="shrink-0" onClick={copyAddress}>
            <Copy className="size-4" />
          </Button>
        </div>
        {copied && <p className="mt-1 text-xs text-green-600">Copied</p>}
      </div>
    </>
  );
}
