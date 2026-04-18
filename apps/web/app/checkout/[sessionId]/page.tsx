"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Copy } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function fetchCheckoutStatus(sessionId: string) {
  return fetch(`${API_BASE}/checkout/status/${sessionId}`).then((r) => {
    if (!r.ok) throw new Error("Session not found");
    return r.json();
  });
}

export default function CheckoutPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [copied, setCopied] = useState(false);

  const { data: session, isLoading, isError, refetch } = useQuery({
    queryKey: ["checkout-status", sessionId],
    queryFn: () => fetchCheckoutStatus(sessionId),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed" || status === "expired") return false;
      return 3000;
    },
  });

  useEffect(() => {
    if (!sessionId) return;
    refetch();
  }, [sessionId, refetch]);

  if (!sessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">Invalid checkout link</p>
      </div>
    );
  }

  if (isLoading && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Checkout session not found</CardTitle>
            <CardDescription>This link may be invalid or expired.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isComplete = session.status === "completed";
  const isFailed = session.status === "failed" || session.status === "expired";

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <Card className="mx-auto w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isComplete && <CheckCircle className="size-6 text-green-600" />}
            {isComplete ? "Payment received" : isFailed ? "Payment failed or expired" : "Complete your payment"}
          </CardTitle>
          <CardDescription>
            {session.description ?? "Pay with Stellar"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isComplete && !isFailed && (
            <>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold">
                  {session.amount} {session.asset}
                </p>
              </div>
              <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium text-muted-foreground">Scan or copy address</p>
                <QRCodeSVG
                  value={session.walletAddress}
                  size={180}
                  level="M"
                  className="rounded-lg bg-white p-2"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stellar address</p>
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background p-3 font-mono text-sm break-all">
                  {session.walletAddress}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(session.walletAddress);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                {copied && <p className="mt-1 text-xs text-green-600">Copied</p>}
              </div>
              <p className="text-xs text-muted-foreground">
                Send exactly <strong>{session.amount} {session.asset}</strong> to the address above from your Stellar wallet (e.g. LOBSTR, StellarX). This is a one-time payment address; after your payment is detected, funds are transferred to the merchant. This page will update when the payment is detected.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Waiting for payment...
              </div>
            </>
          )}
          {isComplete && (
            <>
              <div className="rounded-lg bg-green-500/10 p-4 text-green-700 dark:text-green-400">
                <p className="font-medium">Payment completed</p>
                <p className="text-sm mt-1">{session.amount} {session.asset} received.</p>
                {session.txHash && (
                  <p className="mt-2 font-mono text-xs break-all">{session.txHash}</p>
                )}
              </div>
            </>
          )}
          {isFailed && (
            <p className="text-sm text-muted-foreground">This checkout session is no longer active.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
