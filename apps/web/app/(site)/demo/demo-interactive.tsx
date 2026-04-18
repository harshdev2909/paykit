"use client";

import * as React from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  WifiOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { stellarExpertTxUrl } from "@/lib/stellar-explorer";
import { getPaykitApiBaseUrlOrFallback } from "@/lib/paykit-client";
import { usePrefersReducedMotion } from "@/components/paykit/use-reduced-motion";
import { toast } from "sonner";

const MERCHANT_SSE = "merch_demo";

type DemoPreset = "btc" | "translate" | "summarize" | "expensive";

type PresetDef = {
  label: string;
  preset: DemoPreset;
  input?: { text?: string; target?: string; url?: string };
};

const PRESETS: PresetDef[] = [
  { label: "Get current BTC price", preset: "btc" },
  {
    label: 'Translate "hello" to Japanese',
    preset: "translate",
    input: { text: "hello", target: "ja" },
  },
  {
    label: "Summarize https://news.ycombinator.com",
    preset: "summarize",
    input: { url: "https://news.ycombinator.com" },
  },
  { label: "Try to spend $1 (exceeds cap)", preset: "expensive" },
];

type PromptOk = {
  ok: true;
  receiptId?: string;
  /** Echo of on-chain tx id (also under stellar.txHash). */
  stellarTxHash?: string;
  preset: DemoPreset;
  resourceResult?: unknown;
  resolved: { label: string; path: string; domain: string; amountUsdc: number };
  echo: EchoDetail;
  stellar?: { txHash?: string; error?: string };
  facilitator?: { verify: unknown; settleReceiptId?: string };
  webhookDeliveries: WebhookRow[];
};

type PromptRejected = {
  ok: false;
  status: "rejected";
  reason: "daily_cap_exceeded" | "domain_not_allowed";
  attempted?: string;
  receiptId?: string;
  failureReason?: string;
  preset: DemoPreset;
  resolved: { label: string; path: string; domain: string; amountUsdc: number };
  echo: EchoDetail;
};

type PromptFail = {
  ok: false;
  receiptId?: string;
  failureReason?: string;
  preset?: DemoPreset;
  resolved?: { label: string; path: string; domain: string; amountUsdc: number };
  echo?: EchoDetail;
  stellar?: { txHash?: string; error?: string };
  facilitator?: { verify: unknown };
  webhookDeliveries?: WebhookRow[];
};

type PromptResult = PromptOk | PromptRejected | PromptFail;

type EchoDetail = {
  requestUrl: string;
  method402: string;
  status402: number;
  headers402: Record<string, string>;
  body402: string;
  paymentHeader: string;
  status200: number;
  body200: string;
};

type WebhookRow = {
  url: string;
  attemptCount: number;
  lastError: string | null;
  lastAttemptAt: string | null;
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

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(ts: number, now: number): string {
  const d = Math.floor((now - ts) / 1000);
  if (d < 60) return `${d}s ago`;
  const m = Math.floor(d / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return formatClock(ts);
}

function formatTxLabel(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`;
}

function previewCostForPreset(preset: DemoPreset | null): string {
  if (!preset) return "~$0.01 USDC";
  const map: Record<DemoPreset, string> = {
    btc: "~$0.01 USDC",
    translate: "~$0.02 USDC",
    summarize: "~$0.05 USDC",
    expensive: "~$1.00 USDC",
  };
  return map[preset];
}

function guessPresetFromComposer(text: string): DemoPreset | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (/btc|bitcoin|price/i.test(t)) return "btc";
  if (/translate|japanese|hello/i.test(t)) return "translate";
  if (/summarize|ycombinator|hackernews/i.test(t)) return "summarize";
  if (/spend \$1|try to spend|\$1.*cap|exceed/i.test(t)) return "expensive";
  if (/^https?:\/\//i.test(t.trim())) return "summarize";
  return null;
}

/** Cookie + server use 0-based count; avoid `session?.promptCount === 0` — that is false when session is still null. */
function isFirstPromptForTurnstile(session: { promptCount?: number } | null): boolean {
  return (session?.promptCount ?? 0) === 0;
}

/** API may return `error` as a string or (legacy) a Zod flatten object — never pass objects into React text nodes. */
function formatPromptHttpError(data: { message?: unknown; error?: unknown }): string {
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (data.error !== undefined && typeof data.error === "object" && data.error !== null) {
    try {
      return JSON.stringify(data.error);
    } catch {
      return "Request failed";
    }
  }
  return "Request failed";
}

function agentSummary(data: PromptOk): string {
  const r = data.resourceResult;
  if (data.preset === "btc" && r && typeof r === "object" && "usd" in r) {
    const usd = (r as { usd?: number }).usd;
    if (typeof usd === "number") return `BTC is about $${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })} USD (CoinGecko).`;
  }
  if (data.preset === "translate" && r && typeof r === "object" && "translated" in r) {
    return String((r as { translated?: string }).translated ?? "");
  }
  if (data.preset === "summarize" && r && typeof r === "object" && "summary" in r) {
    return String((r as { summary?: string }).summary ?? "");
  }
  if (data.preset === "expensive") return "This route costs more than your agent is allowed to spend today.";
  try {
    return JSON.stringify(r);
  } catch {
    return "Request completed.";
  }
}

async function fireAnalytics(event: string, props?: Record<string, unknown>) {
  try {
    await fetch("/api/analytics/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...props, t: Date.now() }),
    });
  } catch {
    /* ignore */
  }
}

function AddressPill({ address, label }: { address: string; label?: string }) {
  const short = formatTxLabel(address);
  return (
    <button
      type="button"
      title={address}
      onClick={() => {
        void navigator.clipboard.writeText(address);
        toast.success("Copied address");
      }}
      className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-foreground hover:bg-muted"
    >
      {label ? `${label} ` : ""}
      {short}
    </button>
  );
}

export function DemoInteractive() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const sseBase = React.useMemo(() => getPaykitApiBaseUrlOrFallback(), []);

  const [session, setSession] = React.useState<{
    walletId: string | null;
    promptCount: number;
    demoPromptCount: number;
    demoWindowStart: string;
    walletIssuedAt?: string;
    cAddress?: string;
  } | null>(null);
  const [initError, setInitError] = React.useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = React.useState(true);
  const [slowBackend, setSlowBackend] = React.useState(false);
  const [wakeStrip, setWakeStrip] = React.useState(false);

  const [composer, setComposer] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);

  type ChatMsg = {
    role: "user" | "agent";
    text: string;
    tone?: "amber";
    receipt?: {
      ok: boolean;
      amount: string;
      path: string;
      txHash?: string;
      receiptId?: string;
      expanded?: boolean;
    };
    rejectionRef?: string;
  };
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [logs, setLogs] = React.useState<TxLogEntry[]>([]);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  const logRef = React.useRef<HTMLDivElement | null>(null);

  const [sseStatus, setSseStatus] = React.useState<"connecting" | "open" | "closed">("connecting");
  const prefersReducedMotion = usePrefersReducedMotion();

  const [clock, setClock] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const nowTs = clock;

  const rapidFire = React.useRef<number[]>([]);

  const refreshSession = React.useCallback(async () => {
    const r = await fetch("/api/demo/session", { cache: "no-store" });
    const d = (await r.json()) as {
      walletId?: string | null;
      promptCount?: number;
      demoPromptCount?: number;
      demoWindowStart?: string;
      walletIssuedAt?: string;
      cAddress?: string;
    };
    if (d.walletId) {
      setSession({
        walletId: d.walletId,
        promptCount: d.promptCount ?? 0,
        demoPromptCount: d.demoPromptCount ?? d.promptCount ?? 0,
        demoWindowStart: d.demoWindowStart ?? new Date().toISOString(),
        walletIssuedAt: d.walletIssuedAt ?? d.demoWindowStart,
        cAddress: d.cAddress,
      });
    } else {
      setSession(null);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t0 = performance.now();
        await refreshSession();
        if (cancelled) return;
        const cur = await fetch("/api/demo/session", { cache: "no-store" }).then((x) => x.json());
        if (cancelled) return;
        if (!cur.walletId) {
          const b = await fetch("/api/demo/wallet", { method: "POST" });
          const j = await b.json();
          if (performance.now() - t0 > 2000) setSlowBackend(true);
          if (!b.ok) {
            setInitError((j as { error?: string }).error ?? "Could not start demo session.");
            setBootstrapping(false);
            void fireAnalytics("demo_wallet_error");
            return;
          }
          void fireAnalytics("demo_wallet_created");
        } else {
          void fireAnalytics("demo_session_restored");
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
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/demo/receipts", { cache: "no-store" });
        if (!r.ok || cancelled) return;
        const data = (await r.json()) as {
          receipts?: Array<{
            id: string;
            status: string;
            amount: string;
            asset: string;
            domain?: string | null;
            path?: string | null;
            stellarTxHash?: string | null;
            createdAt?: string;
          }>;
        };
        const rows = data.receipts ?? [];
        setLogs((prev) => {
          const map = new Map(prev.map((p) => [p.id, { ...p }]));
          for (const row of rows) {
            const ts = row.createdAt ? new Date(row.createdAt).getTime() : Date.now();
            const cur = map.get(row.id);
            const hash = row.stellarTxHash ?? cur?.stellarTxHash;
            const next: TxLogEntry = cur
              ? {
                  ...cur,
                  stellarTxHash: hash,
                  txShort: hash ? formatTxLabel(hash) : cur.txShort,
                }
              : {
                  id: row.id,
                  ts,
                  status: row.status === "settled" ? "settled" : "failed",
                  amountLabel: `${row.amount} ${row.asset}`,
                  domainPath: `${row.domain ?? ""}${row.path ?? ""}`,
                  stellarTxHash: row.stellarTxHash ?? undefined,
                  txShort: row.stellarTxHash ? formatTxLabel(row.stellarTxHash) : undefined,
                };
            map.set(row.id, next);
          }
          return Array.from(map.values()).sort((a, b) => b.ts - a.ts);
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const url = `${sseBase}/events/stream?merchant=${encodeURIComponent(MERCHANT_SSE)}`;
    const es = new EventSource(url);
    es.onopen = () => {
      setSseStatus("open");
      setWakeStrip(false);
    };
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
        };
        if (data.type === "connected") return;
        const id = data.receiptId ?? `evt-${Date.now()}`;
        setLogs((prev) => {
          if (prev.some((p) => p.id === id)) {
            return prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    status:
                      data.status === "failed" ? "failed" : data.stellarTxHash ? "settled" : p.status,
                    stellarTxHash: data.stellarTxHash ?? p.stellarTxHash,
                    txShort: data.stellarTxHash ? formatTxLabel(data.stellarTxHash) : p.txShort,
                  }
                : p,
            );
          }
          const entry: TxLogEntry = {
            id,
            ts: Date.now(),
            status: data.status === "failed" ? "failed" : "settled",
            amountLabel: data.amount ? `${data.amount} ${data.asset ?? "USDC"}` : "—",
            domainPath: `${data.domain ?? ""}${data.path ?? ""}`,
            stellarTxHash: data.stellarTxHash,
            txShort: data.stellarTxHash ? formatTxLabel(data.stellarTxHash) : undefined,
          };
          return [entry, ...prev];
        });
        if (data.status === "settled" && data.receiptId) {
          void fireAnalytics("demo_receipt_settled", { receiptId: data.receiptId });
        }
      } catch {
        /* ignore */
      }
    });
    return () => es.close();
  }, [sseBase]);

  const resetAt = React.useMemo(() => {
    const startIso = session?.walletIssuedAt ?? session?.demoWindowStart;
    if (!startIso) return null;
    const start = new Date(startIso).getTime();
    if (Number.isNaN(start)) return null;
    return start + 24 * 60 * 60 * 1000;
  }, [session?.demoWindowStart, session?.walletIssuedAt]);

  React.useEffect(() => {
    if (logs.some((l) => l.status === "settled")) setWakeStrip(false);
  }, [logs]);

  const countdown =
    resetAt !== null ? Math.max(0, Math.floor((resetAt - nowTs) / 1000)) : 0;
  const hh = Math.floor(countdown / 3600);
  const mm = Math.floor((countdown % 3600) / 60);
  const ss = countdown % 60;

  const atPromptLimit =
    session != null && (session.demoPromptCount >= 20 || session.promptCount >= 20);

  async function sendPreset(def: PresetDef) {
    await sendPrompt(def.preset, def.input, def.label);
  }

  async function sendPrompt(preset: DemoPreset, input?: PresetDef["input"], displayText?: string) {
    const label = displayText ?? composer.trim();
    const text = label || (PRESETS.find((p) => p.preset === preset)?.label ?? "");
    if (!text.trim() || sending) return;

    const now = Date.now();
    rapidFire.current = rapidFire.current.filter((t) => now - t < 30_000);
    rapidFire.current.push(now);
    if (rapidFire.current.length > 5) {
      toast.message("Slow down a bit.");
      rapidFire.current = [];
      return;
    }

    if (!session?.walletId) {
      toast.message("Demo wallet not ready yet — wait a moment or reload.");
      return;
    }

    if (isFirstPromptForTurnstile(session) && siteKey && !turnstileToken) {
      toast.message("Complete the verification step first.");
      return;
    }

    setSending(true);
    setMessages((m) => [...m, { role: "user", text }]);

    const pendingId = `pending-${Date.now()}`;
    setLogs((prev) => [
      {
        id: pendingId,
        ts: Date.now(),
        status: "pending",
        amountLabel: previewCostForPreset(preset),
        domainPath: "…",
      },
      ...prev,
    ]);

    const slowTimer = window.setTimeout(() => setWakeStrip(true), 3000);

    try {
      const r = await fetch("/api/demo/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset,
          input,
          turnstileToken: isFirstPromptForTurnstile(session) ? turnstileToken ?? undefined : undefined,
        }),
      });
      clearTimeout(slowTimer);
      setWakeStrip(false);

      const rawText = await r.text();
      type PromptEnvelope = PromptResult & {
        error?: string;
        message?: string;
        limit?: number;
      };
      let data: PromptEnvelope;
      try {
        data = rawText.trim()
          ? (JSON.parse(rawText) as PromptEnvelope)
          : ({ ok: false, error: "empty_response" } as PromptEnvelope);
      } catch {
        toast.error("Unexpected response from demo API (not JSON). Check deployment env.");
        setMessages((m) => [
          ...m,
          {
            role: "agent",
            text: `Request failed (${r.status}). ${rawText.slice(0, 200)}`,
          },
        ]);
        return;
      }

      setLogs((prev) => prev.filter((p) => p.id !== pendingId));

      if (r.status === 429) {
        toast.error(data.message ?? "Rate limited");
        setMessages((m) => [
          ...m,
          { role: "agent", text: data.message ?? "Prompt limit reached for this wallet." },
        ]);
        return;
      }
      if (!r.ok) {
        const rawErr = formatPromptHttpError(data);
        const walletGone =
          rawErr === "Wallet not found" ||
          rawErr.toLowerCase().includes("wallet not found");
        const explain = walletGone
          ? "This page keeps a separate demo wallet in cookies — it is not the same row as Dashboard → Wallet. Click Reset wallet (above the chat), then try again. Ensure PAYKIT_DEMO_MERCHANT_API_KEY is identical in apps/web/.env.local and apps/api/.env and matches the merchant key you use in Dashboard Settings."
          : rawErr;
        toast.error(walletGone ? "Demo session wallet mismatch — try Reset wallet" : rawErr);
        setMessages((m) => [...m, { role: "agent", text: explain }]);
        return;
      }

      if ("status" in data && data.ok === false && data.status === "rejected") {
        const amt = `$${Number(data.attempted ?? data.resolved?.amountUsdc ?? 0).toFixed(2)} USDC`;
        void fireAnalytics("demo_policy_rejected", { reason: data.reason });
        setMessages((m) => [
          ...m,
          {
            role: "agent",
            tone: "amber",
            text: `Can't pay — would exceed daily cap of $0.50 USDC.`,
            rejectionRef: data.receiptId,
          },
        ]);
        const entry: TxLogEntry = {
          id: data.receiptId ?? `rej-${Date.now()}`,
          ts: Date.now(),
          status: "failed",
          amountLabel: amt,
          domainPath: data.resolved ? `${data.resolved.domain}${data.resolved.path}` : "—",
          detail: data as PromptResult,
        };
        setLogs((prev) => prependReceiptLog(prev, entry));
        await refreshSession();
        setTurnstileToken(null);
        return;
      }

      if (data.ok === false) {
        const fail = data as PromptFail;
        setMessages((m) => [
          ...m,
          {
            role: "agent",
            text: fail.failureReason ?? "Payment failed.",
          },
        ]);
        const entry: TxLogEntry = {
          id: fail.receiptId ?? `fail-${Date.now()}`,
          ts: Date.now(),
          status: "failed",
          amountLabel: fail.resolved ? `$${fail.resolved.amountUsdc.toFixed(2)} USDC` : "—",
          domainPath: fail.resolved ? `${fail.resolved.domain}${fail.resolved.path}` : "—",
          detail: fail as PromptResult,
          stellarTxHash: fail.stellar?.txHash,
          txShort: fail.stellar?.txHash ? formatTxLabel(fail.stellar.txHash) : undefined,
        };
        setLogs((prev) => prependReceiptLog(prev, entry));
        await refreshSession();
        setTurnstileToken(null);
        return;
      }

      const ok = data as PromptOk;
      if (
        !ok.resolved ||
        typeof ok.resolved.amountUsdc !== "number" ||
        !Number.isFinite(ok.resolved.amountUsdc)
      ) {
        toast.error("Invalid success payload from demo API.");
        setMessages((m) => [...m, { role: "agent", text: "Something went wrong — missing payment details." }]);
        return;
      }
      const amt = `$${ok.resolved.amountUsdc.toFixed(2)} USDC`;
      const tx = ok.stellar?.txHash ?? ok.stellarTxHash;
      void fireAnalytics("demo_prompt_sent", { preset: ok.preset, receiptId: ok.receiptId });

      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: agentSummary(ok),
          receipt: {
            ok: true,
            amount: amt,
            path: ok.resolved.path,
            txHash: tx,
            receiptId: ok.receiptId,
            expanded: false,
          },
        },
      ]);

      const entry: TxLogEntry = {
        id: ok.receiptId ?? `local-${Date.now()}`,
        ts: Date.now(),
        status: "settled",
        amountLabel: amt,
        domainPath: `${ok.resolved.domain}${ok.resolved.path}`,
        stellarTxHash: tx,
        txShort: tx ? formatTxLabel(tx) : undefined,
        detail: ok as PromptResult,
      };
      setLogs((prev) => prependReceiptLog(prev, entry));
      await refreshSession();
      setTurnstileToken(null);
      void fireAnalytics("demo_prompt_success", { receiptId: ok.receiptId });
    } catch (e) {
      clearTimeout(slowTimer);
      setWakeStrip(false);
      toast.error(e instanceof Error ? e.message : "Network error");
      setLogs((prev) => prev.filter((p) => p.id !== pendingId));
    } finally {
      setSending(false);
      setComposer("");
    }
  }

  async function onComposerSubmit() {
    const raw = composer.trim();
    const guessed = guessPresetFromComposer(raw);
    if (!guessed) {
      toast.message('Try a preset above or paste a URL to summarize.');
      return;
    }
    let input: PresetDef["input"];
    if (guessed === "summarize" && /^https?:\/\//i.test(raw)) input = { url: raw.trim() };
    await sendPrompt(guessed, input, raw);
  }

  async function resetWallet() {
    setBootstrapping(true);
    try {
      const r = await fetch("/api/demo/reset", { method: "POST" });
      if (!r.ok) {
        const j = await r.json();
        toast.error((j as { error?: string }).error ?? "Reset failed");
        return;
      }
      setMessages([]);
      setLogs([]);
      await refreshSession();
      toast.success("New demo wallet provisioned.");
      void fireAnalytics("demo_wallet_reset");
    } finally {
      setBootstrapping(false);
    }
  }

  const scrollReceiptIntoView = React.useCallback((id?: string) => {
    if (!id || !logRef.current) return;
    const el = logRef.current.querySelector(`[data-receipt-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  if (bootstrapping && !session) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span>{slowBackend ? "Waking up the testnet backend…" : "Preparing testnet wallet…"}</span>
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
    <div className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden lg:flex-row">
      {/* Chat */}
      <section className="flex min-h-[60vh] flex-[1.2] flex-col overflow-hidden border-border lg:min-h-0 lg:flex-[60] lg:border-r">
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
          <div className="no-scrollbar flex max-w-[100vw] flex-1 gap-2 overflow-x-auto">
            <span className="whitespace-nowrap rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px]">
              Daily cap: $0.50 USDC
            </span>
            <span className="whitespace-nowrap rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px]">
              Allowed: paykit-1.onrender.com
            </span>
            <span className="whitespace-nowrap rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
              Resets in {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void resetWallet()}
            className="shrink-0 text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Reset wallet
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Choose a preset below. Your agent pays each API call with testnet USDC under the policy shown above.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "border border-[var(--paykit-accent)]/55 bg-[var(--paykit-accent)]/10 text-foreground"
                    : "border border-border bg-muted/25 text-foreground",
                  m.tone === "amber" && "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100",
                )}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.receipt && (
                  <details className="mt-2 space-y-1 rounded-md border border-border bg-background/90 px-2 py-1.5 font-mono text-[11px]">
                    <summary className="cursor-pointer list-none">
                      <span className="inline-flex items-center gap-1">
                        Paid {m.receipt.amount} → {m.receipt.path} · tx{" "}
                        {m.receipt.txHash ? formatTxLabel(m.receipt.txHash) : "…"}{" "}
                        <ChevronRight className="inline size-3" aria-hidden />
                      </span>
                    </summary>
                    {m.receipt.txHash && (
                      <div className="pt-1">
                        <a
                          href={stellarExpertTxUrl(m.receipt.txHash, "testnet")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[var(--paykit-accent)] underline-offset-2 hover:underline"
                        >
                          View on stellar.expert
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      </div>
                    )}
                  </details>
                )}
                {m.rejectionRef && (
                  <button
                    type="button"
                    className="mt-2 text-[11px] font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
                    onClick={() => scrollReceiptIntoView(m.rejectionRef)}
                  >
                    View rejection receipt →
                  </button>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Paying paywalled API…
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-3 py-3">
          <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={sending || bootstrapping || atPromptLimit || !session?.walletId}
                onClick={() => {
                  setComposer(p.label);
                  window.setTimeout(() => void sendPreset(p), 150);
                }}
                className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:border-[var(--paykit-accent)]/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
          {session?.walletId && isFirstPromptForTurnstile(session) && siteKey ? (
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
                  void onComposerSubmit();
                }
              }}
              placeholder="Presets above, or paste a URL to summarize"
              disabled={sending || bootstrapping || atPromptLimit || !session?.walletId}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border pr-28 pl-3 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
              aria-label="Prompt"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">
              {previewCostForPreset(guessPresetFromComposer(composer))}
            </span>
          </div>
          {atPromptLimit ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Prompt limit reached. Wallet resets in {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}:
              {String(ss).padStart(2, "0")}.
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Testnet USDC. Wallet resets every 24h.
            </p>
          )}
          {session?.cAddress ? (
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <AddressPill address={session.cAddress} label="Agent wallet" />
            </div>
          ) : null}
        </div>
      </section>

      {/* Log */}
      <section className="flex min-h-[40vh] flex-1 flex-col overflow-hidden border-border lg:min-h-0 lg:flex-[40]">
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-3 py-2">
          <h2 className="text-sm font-semibold">Live transactions</h2>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span
              className={cn(
                "size-2 rounded-full",
                sseStatus === "open" && "animate-pulse bg-emerald-500 [animation-duration:1.5s]",
                sseStatus === "connecting" && "bg-amber-500",
                sseStatus === "closed" && "bg-red-500",
              )}
              aria-hidden
            />
            {sseStatus === "open"
              ? "Live"
              : sseStatus === "connecting"
                ? "Reconnecting…"
                : "Disconnected"}
          </div>
        </header>

        {wakeStrip && (
          <div className="shrink-0 border-b border-border bg-muted/50 px-3 py-1.5 text-center text-[11px] text-muted-foreground">
            Waking up the testnet backend…
          </div>
        )}

        <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {logs.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <WifiOff className="size-8 opacity-40" aria-hidden />
              <p>Try a prompt on the left to see transactions here.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <li
                  key={log.id}
                  data-receipt-id={log.id}
                  className={cn(!prefersReducedMotion && "motion-safe:transition-opacity motion-safe:duration-200")}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => ({ ...e, [log.id]: !e[log.id] }))}
                    className="w-full rounded-lg border border-border bg-muted/15 px-3 py-2 text-left text-[13px] transition-[background] duration-200 ease-out hover:bg-muted/30"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatRelative(log.ts, nowTs)}
                        {nowTs - log.ts > 3600_000 ? ` · ${formatClock(log.ts)}` : ""}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
                          log.status === "settled" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                          log.status === "failed" && "bg-red-500/15 text-red-700 dark:text-red-400",
                          log.status === "pending" && "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                        )}
                      >
                        {log.status === "pending" ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="size-3 animate-spin" aria-hidden />
                            pending
                          </span>
                        ) : (
                          log.status
                        )}
                      </span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[12px] text-foreground">
                      {truncateMiddle(log.domainPath, 40)}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[12px]">{log.amountLabel}</span>
                      {log.txShort && log.stellarTxHash ? (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            void navigator.clipboard.writeText(log.stellarTxHash!);
                            toast.success("Tx hash copied");
                          }}
                          className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]"
                          title={log.stellarTxHash}
                        >
                          {log.txShort}
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-1 flex justify-end text-muted-foreground">
                      {expanded[log.id] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </div>
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-200 ease-out",
                      expanded[log.id] ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      {expanded[log.id] && log.detail && log.detail.echo && (
                        <div className="mt-1 space-y-2 rounded-lg border border-border bg-muted/10 p-3 font-mono text-[11px] leading-relaxed">
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Request</p>
                            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                              {log.detail.echo.method402} {log.detail.echo.requestUrl}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">
                              402 response
                              <abbr
                                title="HTTP 402 means payment is required before the server returns the resource."
                                className="ml-1 cursor-help no-underline"
                              >
                                (?)
                              </abbr>
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              Status {log.detail.echo.status402}
                            </p>
                            <table className="mt-1 w-full border-collapse text-left text-[10px]">
                              <tbody>
                                {Object.entries(log.detail.echo.headers402).map(([k, v]) => (
                                  <tr key={k} className="border-b border-border/60">
                                    <th className="py-0.5 pr-2 font-normal text-muted-foreground">{k}</th>
                                    <td className="py-0.5 break-all">{v}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-muted-foreground">
                              {log.detail.echo.body402.slice(0, 4000)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">
                              Payment header
                              <abbr
                                title="Proof attached to the retried HTTP request showing your agent agreed to pay."
                                className="ml-1 cursor-help no-underline"
                              >
                                (?)
                              </abbr>
                            </p>
                            <button
                              type="button"
                              className="mt-1 max-w-full break-all text-left text-[var(--paykit-accent)] underline-offset-2 hover:underline"
                              onClick={() => {
                                const hdr = log.detail?.echo?.paymentHeader ?? "";
                                if (hdr) void navigator.clipboard.writeText(hdr);
                                toast.success("Copied");
                              }}
                            >
                              {truncateMiddle(log.detail.echo.paymentHeader, 48)}
                            </button>
                            <button
                              type="button"
                              className="mt-1 block text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                              onClick={() => {
                                const hdr = log.detail?.echo?.paymentHeader ?? "";
                                if (hdr) void navigator.clipboard.writeText(hdr);
                                toast.success("Copied full header");
                              }}
                            >
                              Copy full
                            </button>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Facilitator</p>
                            <p className="mt-1 text-muted-foreground">
                              Verify:{" "}
                              {"facilitator" in log.detail &&
                              log.detail.facilitator &&
                              typeof log.detail.facilitator === "object" &&
                              "verify" in log.detail.facilitator &&
                              typeof log.detail.facilitator.verify === "object"
                                ? "recorded"
                                : "n/a"}
                            </p>
                            <p className="text-muted-foreground">
                              Settle: receipt{" "}
                              {"facilitator" in log.detail &&
                              log.detail.facilitator &&
                              typeof log.detail.facilitator === "object" &&
                              "settleReceiptId" in log.detail.facilitator
                                ? String(
                                    (log.detail.facilitator as { settleReceiptId?: string }).settleReceiptId ??
                                      ("receiptId" in log.detail ? log.detail.receiptId : undefined) ??
                                      "—",
                                  )
                                : "receiptId" in log.detail
                                  ? String(log.detail.receiptId ?? "—")
                                  : "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Settlement</p>
                            {(() => {
                              const stx = settlementTxHash(log);
                              return stx ? (
                              <>
                                <a
                                  href={stellarExpertTxUrl(stx, "testnet")}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 text-[var(--paykit-accent)] underline-offset-2 hover:underline"
                                >
                                  {formatTxLabel(stx)}
                                  <ArrowUpRight className="size-3" aria-hidden />
                                </a>
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  Ledger height and exact finality times are visible on the explorer for this network.
                                </p>
                              </>
                            ) : (
                              <p className="text-muted-foreground">No on-chain hash for this row.</p>
                            );
                            })()}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase text-muted-foreground">Webhooks</p>
                            {webhookRowsFromDetail(log.detail).length === 0 ? (
                              <p className="mt-1 text-muted-foreground">None recorded.</p>
                            ) : (
                              <ul className="mt-1 space-y-1">
                                {webhookRowsFromDetail(log.detail).map((w, i) => (
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
                      {expanded[log.id] && (!log.detail || !log.detail.echo) && (
                        <p className="mt-2 px-3 text-[11px] text-muted-foreground">
                          Detailed steps load on new prompts; history shows amounts and hashes from storage.
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function truncateMiddle(s: string, max: number): string {
  if (s.length <= max) return s;
  const mid = Math.floor(max / 2) - 1;
  return `${s.slice(0, mid)}…${s.slice(s.length - mid)}`;
}

function stellarTxFromDetail(detail: PromptResult): string | undefined {
  if ("stellar" in detail && detail.stellar?.txHash) return detail.stellar.txHash;
  if ("ok" in detail && detail.ok === true) {
    const sx = (detail as PromptOk).stellarTxHash;
    if (typeof sx === "string" && sx.length > 0) return sx;
  }
  return undefined;
}

/** Full prompt payload may omit nested `stellar`; SSE/hydration only populate `log.stellarTxHash`. */
function settlementTxHash(log: TxLogEntry): string | undefined {
  if (log.detail) {
    const fromDetail = stellarTxFromDetail(log.detail);
    if (fromDetail) return fromDetail;
  }
  return log.stellarTxHash;
}

function prependReceiptLog(prev: TxLogEntry[], entry: TxLogEntry): TxLogEntry[] {
  return [entry, ...prev.filter((p) => p.id !== entry.id)];
}

function webhookRowsFromDetail(detail: PromptResult): WebhookRow[] {
  if ("webhookDeliveries" in detail && Array.isArray(detail.webhookDeliveries)) {
    return detail.webhookDeliveries;
  }
  return [];
}
