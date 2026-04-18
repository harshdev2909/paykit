"use client";

import * as React from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  WifiOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { stellarExpertTxUrl } from "@/lib/stellar-explorer";
import { toast } from "sonner";

type SessionState = {
  walletId: string | null;
  promptCount: number;
  demoWindowStart: string;
  publicKey?: string;
};

type DemoEcho = {
  requestUrl: string;
  status402: number;
  headers402: Record<string, string>;
  body402: string;
  paymentHeader: string;
  status200: number;
  body200: string;
};

type PromptResult = {
  ok: boolean;
  receiptId?: string;
  failureReason?: string;
  resolved: {
    label: string;
    pathSuffix: string;
    domain: string;
    amountUsdc: number;
    overspend: boolean;
  };
  echo: DemoEcho;
  stellar?: { txHash?: string; error?: string };
  facilitator?: { verify: unknown; settleReceiptId?: string };
  webhookDeliveries: {
    url: string;
    attemptCount: number;
    lastError: string | null;
    lastAttemptAt: string | null;
  }[];
};

type TxLogEntry = {
  id: string;
  ts: number;
  status: "settled" | "failed" | "pending";
  amountLabel: string;
  domainPath: string;
  txShort?: string;
  stellarTxHash?: string;
  detail?: PromptResult;
};

function previewCost(prompt: string): string {
  const t = prompt.trim().toLowerCase();
  let usd = 0.02;
  if (/summarize|ycombinator|hackernews/i.test(t)) usd = 0.03;
  if (/spend \$1|try to spend|\$1.*cap|exceed/i.test(t)) usd = 1.0;
  return `~$${usd.toFixed(2)} USDC`;
}

function relativeAgo(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

const PRESETS = [
  "Get current BTC price",
  'Translate "hello" to Japanese',
  "Summarize https://news.ycombinator.com",
  "Try to spend $1 (exceeds cap)",
];

export function DemoInteractive() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const [session, setSession] = React.useState<SessionState | null>(null);
  const [initError, setInitError] = React.useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = React.useState(true);

  const [composer, setComposer] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);

  type ChatMsg = {
    role: "user" | "agent";
    text: string;
    receipt?: {
      ok: boolean;
      amount: string;
      path: string;
      txHash?: string;
    };
  };
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [logs, setLogs] = React.useState<TxLogEntry[]>([]);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const [sseStatus, setSseStatus] = React.useState<"connecting" | "open" | "closed">("connecting");

  const [clock, setClock] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const nowTs = clock;

  const refreshSession = React.useCallback(async () => {
    const r = await fetch("/api/demo/session", { cache: "no-store" });
    const d = (await r.json()) as SessionState & {
      ok?: boolean;
      demoWindowStart?: string;
      demoSpentUsdc?: string;
      dailyCap?: string;
    };
    if (d.walletId) {
      setSession({
        walletId: d.walletId,
        promptCount: d.promptCount ?? 0,
        demoWindowStart: d.demoWindowStart ?? new Date().toISOString(),
        publicKey: d.publicKey,
      });
    } else {
      setSession(null);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshSession();
        const cur = await fetch("/api/demo/session", { cache: "no-store" }).then((x) => x.json());
        if (cancelled) return;
        if (!cur.walletId) {
          const b = await fetch("/api/demo/bootstrap", { method: "POST" });
          const j = await b.json();
          if (!b.ok) {
            setInitError((j as { error?: string }).error ?? "Could not start demo session.");
            setBootstrapping(false);
            return;
          }
          await new Promise((r) => setTimeout(r, 0));
        }
        await refreshSession();
      } catch (e) {
        if (!cancelled) setInitError(e instanceof Error ? e.message : "Init failed");
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  React.useEffect(() => {
    const es = new EventSource("/api/demo/events");
    es.onopen = () => setSseStatus("open");
    es.onerror = () => setSseStatus("closed");
    es.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data as string) as {
          type?: string;
          receiptId?: string;
          status?: string;
          amount?: string;
          asset?: string;
          domain?: string;
          path?: string;
          failureReason?: string;
          stellarTxHash?: string;
          label?: string;
        };
        if (data.type === "connected") return;
        const id = data.receiptId ?? `evt-${Date.now()}`;
        setLogs((prev) => {
          if (prev.some((p) => p.id === id)) return prev;
          const entry: TxLogEntry = {
            id,
            ts: Date.now(),
            status: data.status === "failed" ? "failed" : data.type?.includes("failed") ? "failed" : "settled",
            amountLabel: data.amount ? `${data.amount} ${data.asset ?? "USDC"}` : "—",
            domainPath: `${data.domain ?? ""}${data.path ?? ""}`,
            stellarTxHash: data.stellarTxHash,
            txShort: data.stellarTxHash
              ? `${data.stellarTxHash.slice(0, 6)}…${data.stellarTxHash.slice(-4)}`
              : undefined,
          };
          return [entry, ...prev];
        });
      } catch {
        /* ignore */
      }
    });
    return () => es.close();
  }, []);

  const resetAt = React.useMemo(() => {
    if (!session?.demoWindowStart) return null;
    const start = new Date(session.demoWindowStart).getTime();
    if (Number.isNaN(start)) return null;
    return start + 24 * 60 * 60 * 1000;
  }, [session?.demoWindowStart]);

  const countdown =
    resetAt !== null ? Math.max(0, Math.floor((resetAt - nowTs) / 1000)) : 0;
  const hh = Math.floor(countdown / 3600);
  const mm = Math.floor((countdown % 3600) / 60);
  const ss = countdown % 60;

  async function sendPrompt(text: string) {
    if (!text.trim() || sending) return;
    if (session?.promptCount === 0 && siteKey && !turnstileToken) {
      toast.message("Complete the verification step first.");
      return;
    }
    setSending(true);
    setMessages((m) => [...m, { role: "user", text }]);
    try {
      const r = await fetch("/api/demo/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          turnstileToken: session?.promptCount === 0 ? turnstileToken : undefined,
        }),
      });
      const data = (await r.json()) as PromptResult & {
        error?: string;
        message?: string;
        limit?: number;
      };
      if (r.status === 429) {
        toast.error(data.message ?? "Rate limited");
        setMessages((m) => [
          ...m,
          {
            role: "agent",
            text: data.message ?? "You’ve hit the session prompt limit.",
          },
        ]);
        return;
      }
      if (!r.ok) {
        toast.error(data.message ?? data.error ?? "Request failed");
        setMessages((m) => [
          ...m,
          { role: "agent", text: data.message ?? data.error ?? "Something went wrong." },
        ]);
        return;
      }

      const ok = data.ok;
      const path = data.resolved.pathSuffix;
      const amt = `$${data.resolved.amountUsdc.toFixed(2)} USDC`;
      const tx = data.stellar?.txHash;
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: ok
            ? `Paid for ${data.resolved.label} — 402 challenge, Stellar payment, receipt recorded.`
            : data.failureReason ?? "Policy blocked this payment.",
          receipt: {
            ok: !!ok,
            amount: amt,
            path,
            txHash: tx,
          },
        },
      ]);

      const entry: TxLogEntry = {
        id: data.receiptId ?? `local-${Date.now()}`,
        ts: Date.now(),
        status: ok ? "settled" : "failed",
        amountLabel: amt,
        domainPath: `${data.resolved.domain}${path}`,
        stellarTxHash: tx,
        txShort: tx ? `${tx.slice(0, 6)}…${tx.slice(-4)}` : undefined,
        detail: data,
      };
      setLogs((prev) => {
        if (prev.some((p) => p.id === entry.id)) return [entry, ...prev.filter((p) => p.id !== entry.id)];
        return [entry, ...prev];
      });
      await refreshSession();
      setTurnstileToken(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setSending(false);
      setComposer("");
    }
  }

  async function resetWallet() {
    setBootstrapping(true);
    try {
      const r = await fetch("/api/demo/reset", { method: "POST" });
      if (!r.ok) {
        const j = await r.json();
        toast.error(j.error ?? "Reset failed");
        return;
      }
      setMessages([]);
      setLogs([]);
      await refreshSession();
      toast.success("New demo wallet provisioned.");
    } finally {
      setBootstrapping(false);
    }
  }

  if (bootstrapping && !session) {
    return (
      <div className="flex min-h-[480px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span>Preparing testnet wallet…</span>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        {initError}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <section className="flex min-h-[560px] flex-1 flex-col rounded-xl border border-border bg-card shadow-sm lg:max-w-[60%]">
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
          <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-foreground">
            Daily cap: $0.50 USDC
          </span>
          <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-foreground">
            Allowed: api.demo.paykit.dev
          </span>
          <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
            Resets in {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Pick a preset or type a task. The agent pays the echo paywall on testnet.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col gap-2",
                m.role === "user" ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[95%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "border border-[var(--paykit-accent)]/50 bg-[var(--paykit-accent)]/10 text-foreground"
                    : "border border-border bg-muted/30 text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.receipt && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/80 px-2 py-1.5 font-mono text-[11px]">
                    <span className={cn(!m.receipt.ok && "text-destructive")}>
                      {m.receipt.ok ? "Paid" : "Blocked"} {m.receipt.amount} → {m.receipt.path}
                    </span>
                    {m.receipt.txHash && (
                      <a
                        href={stellarExpertTxUrl(m.receipt.txHash, "testnet")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[var(--paykit-accent)] underline-offset-2 hover:underline"
                      >
                        <ExternalLink className="size-3" aria-hidden />
                        stellar.expert
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Submitting payment…
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setComposer(p)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:border-[var(--paykit-accent)]/40 hover:text-foreground"
              >
                {p}
              </button>
            ))}
          </div>
          {session?.promptCount === 0 && siteKey ? (
            <div className="mb-3 flex justify-center">
              <Turnstile
                siteKey={siteKey}
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken(null)}
              />
            </div>
          ) : null}
          <div className="relative flex gap-2">
            <input
              type="text"
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendPrompt(composer);
                }
              }}
              placeholder="Ask the agent to call a paid API…"
              disabled={sending || bootstrapping}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border pr-24 pl-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
              aria-label="Prompt"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">
              {previewCost(composer)}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Testnet USDC. Wallet resets every 24h from the policy window start.{" "}
            <button
              type="button"
              onClick={() => void resetWallet()}
              className="font-medium text-[var(--paykit-accent)] underline-offset-2 hover:underline"
            >
              Reset now
            </button>
          </p>
        </div>
      </section>

      <section className="flex min-h-[560px] flex-1 flex-col rounded-xl border border-border bg-card shadow-sm lg:max-w-[40%]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Live transactions</h2>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="relative flex size-2">
              <span
                className={cn(
                  "absolute inline-flex size-2 rounded-full",
                  sseStatus === "open" && "animate-pulse bg-emerald-500",
                  sseStatus === "connecting" && "bg-amber-500",
                  sseStatus === "closed" && "bg-red-500",
                )}
              />
            </span>
            {sseStatus === "open" ? "Live" : sseStatus === "connecting" ? "Connecting" : "Disconnected"}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {logs.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <WifiOff className="size-8 opacity-40" aria-hidden />
              <p>Try a prompt on the left to see transactions here.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li key={log.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [log.id]: !e[log.id] }))}
                    className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-left text-[13px] transition-colors hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {relativeAgo(Date.now() - log.ts)}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
                          log.status === "settled" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                          log.status === "failed" && "bg-red-500/15 text-red-700 dark:text-red-400",
                        )}
                      >
                        {log.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[12px]">
                      <span>{log.amountLabel}</span>
                      <span className="text-muted-foreground">{log.domainPath}</span>
                    </div>
                    {log.txShort && (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          if (log.stellarTxHash) void navigator.clipboard.writeText(log.stellarTxHash);
                          toast.success("Tx hash copied");
                        }}
                        className="mt-1 inline-flex rounded border border-border px-1.5 py-0.5 font-mono text-[10px]"
                      >
                        {log.txShort}
                      </button>
                    )}
                    <div className="mt-1 flex justify-end text-muted-foreground">
                      {expanded[log.id] ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </div>
                  </button>
                  {expanded[log.id] && log.detail && (
                    <div className="mt-1 space-y-2 rounded-lg border border-border bg-muted/15 p-3 font-mono text-[11px] leading-relaxed">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Request</p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                          GET {log.detail.echo.requestUrl}
                        </pre>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">402 headers</p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.detail.echo.headers402, null, 2)}
                        </pre>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-muted-foreground">
                          {log.detail.echo.body402.slice(0, 800)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">X-PAYMENT (truncated)</p>
                        <button
                          type="button"
                          className="mt-1 break-all text-left text-[var(--paykit-accent)] underline"
                          onClick={() => {
                            void navigator.clipboard.writeText(log.detail!.echo.paymentHeader);
                            toast.success("Copied");
                          }}
                        >
                          {log.detail.echo.paymentHeader.slice(0, 48)}…
                        </button>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Facilitator verify</p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(log.detail.facilitator?.verify ?? {}, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Settle receipt</p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                          {log.detail.facilitator?.settleReceiptId ?? log.detail.receiptId ?? "—"}
                        </pre>
                      </div>
                      {log.detail.stellar?.txHash ? (
                        <div>
                          <p className="text-[10px] uppercase text-muted-foreground">Stellar tx</p>
                          <a
                            href={stellarExpertTxUrl(log.detail.stellar.txHash, "testnet")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[var(--paykit-accent)] underline"
                          >
                            {log.detail.stellar.txHash.slice(0, 12)}… <ArrowUpRight className="size-3" />
                          </a>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground">Webhooks</p>
                        {log.detail.webhookDeliveries.length === 0 ? (
                          <p className="mt-1 text-muted-foreground">No deliveries recorded for this receipt.</p>
                        ) : (
                          <ul className="mt-1 space-y-1">
                            {log.detail.webhookDeliveries.map((w, i) => (
                              <li key={i}>
                                {w.url} · attempts {w.attemptCount}
                                {w.lastError ? ` · ${w.lastError}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
