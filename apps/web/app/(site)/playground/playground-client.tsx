"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, KeyRound, Loader2 } from "lucide-react";

import { MarkApiExploredOnMount } from "@/components/onboarding/mark-api-explored-on-mount";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";

type HttpMethod = "GET" | "POST" | "PATCH";

type Preset = {
  id: string;
  label: string;
  method: HttpMethod;
  path: string;
  body: string;
  needsKey?: boolean;
};

const PRESETS: Preset[] = [
  {
    id: "supported",
    label: "GET supported",
    method: "GET",
    path: "/v1/x402/supported",
    body: "",
    needsKey: false,
  },
  {
    id: "wallets",
    label: "GET wallets",
    method: "GET",
    path: "/v1/wallets",
    body: "",
    needsKey: true,
  },
  {
    id: "receipts",
    label: "GET receipts",
    method: "GET",
    path: "/v1/receipts?limit=10",
    body: "",
    needsKey: true,
  },
  {
    id: "verify",
    label: "POST verify",
    method: "POST",
    path: "/v1/x402/verify",
    body: JSON.stringify(
      {
        paymentHeader: "<base64-or-0x>",
        resource: "https://example.com/paid",
        domain: "example.com",
      },
      null,
      2,
    ),
    needsKey: true,
  },
  {
    id: "settle",
    label: "POST settle",
    method: "POST",
    path: "/v1/x402/settle",
    body: JSON.stringify(
      {
        walletFrom: "G…",
        walletTo: "G…",
        asset: "USDC",
        amount: "0.01",
      },
      null,
      2,
    ),
    needsKey: true,
  },
];

function formatResponse(status: number, statusText: string, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return `${status} ${statusText}\n\n(empty body)`;
  }
  try {
    const parsed = JSON.parse(trimmed);
    return `${status} ${statusText}\n\n${JSON.stringify(parsed, null, 2)}`;
  } catch {
    return `${status} ${statusText}\n\n${raw}`;
  }
}

export function PlaygroundClient() {
  const sessionApiKey = useAuthStore((s) => s.apiKey);

  const [baseUrl, setBaseUrl] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [method, setMethod] = React.useState<HttpMethod>("GET");
  const [path, setPath] = React.useState("/v1/x402/supported");
  const [body, setBody] = React.useState("");
  const [out, setOut] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [activePresetId, setActivePresetId] = React.useState<string | null>("supported");

  React.useEffect(() => {
    setBaseUrl(process.env.NEXT_PUBLIC_PAYKIT_API_URL || "");
  }, []);

  function applyPreset(p: Preset) {
    setMethod(p.method);
    setPath(p.path);
    setBody(p.body);
    setActivePresetId(p.id);
    setErr(null);
    setOut(null);
  }

  function applySessionKey() {
    if (sessionApiKey) {
      setApiKey(sessionApiKey);
    }
  }

  async function send() {
    setLoading(true);
    setErr(null);
    setOut(null);
    if (!baseUrl.trim()) {
      setErr("Add your PayKit API base URL (usually from NEXT_PUBLIC_PAYKIT_API_URL).");
      setLoading(false);
      return;
    }
    try {
      const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
      const hasBody = (method === "POST" || method === "PATCH") && body.trim().length > 0;
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(apiKey.trim() ? { "x-api-key": apiKey.trim() } : {}),
        },
        body: hasBody ? body : undefined,
      });
      const text = await res.text();
      setOut(formatResponse(res.status, res.statusText, text));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const bodyDisabled = method === "GET";

  return (
    <div className="mx-auto max-w-3xl flex-1 space-y-8 px-4 py-12">
      <MarkApiExploredOnMount />

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Playground</h1>
        <p className="mt-2 text-muted-foreground">
          Call the PayKit REST API from your browser. CORS must allow this origin — same host you use for{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">NEXT_PUBLIC_PAYKIT_API_URL</code>.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          See{" "}
          <Link href="/docs/rest/authentication" className="text-[var(--paykit-accent)] underline-offset-2 hover:underline">
            Authentication
          </Link>{" "}
          and endpoint pages for full request shapes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick presets</CardTitle>
          <CardDescription>
            Sets method, path, and sample JSON. Presets that need auth assume you paste <code className="font-mono text-xs">x-api-key</code> below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant={activePresetId === p.id ? "secondary" : "outline"}
              size="sm"
              className="font-mono text-xs"
              onClick={() => applyPreset(p)}
            >
              {p.label}
              {p.needsKey ? (
                <span className="ml-1 text-[10px] font-normal uppercase text-muted-foreground">key</span>
              ) : null}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request</CardTitle>
          <CardDescription>
            Defaults match <strong className="font-medium text-foreground">GET /v1/x402/supported</strong> (no auth).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="pg-base" className="text-sm font-medium">
              Base URL
            </label>
            <Input
              id="pg-base"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:3001"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label htmlFor="pg-key" className="text-sm font-medium">
                API key <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              {sessionApiKey ? (
                <Button type="button" variant="outline" size="sm" className="h-8 w-full sm:w-auto" onClick={applySessionKey}>
                  <KeyRound className="mr-1.5 size-3.5" />
                  Use session key from dashboard
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Paste a key in{" "}
                  <Link href="/dashboard/settings" className="underline underline-offset-2">
                    Settings
                  </Link>{" "}
                  to fill this in one click.
                </span>
              )}
            </div>
            <Input
              id="pg-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="pk_test_…"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,120px)_1fr] sm:items-end">
            <div className="space-y-2">
              <label htmlFor="pg-method" className="text-sm font-medium">
                Method
              </label>
              <select
                id="pg-method"
                value={method}
                onChange={(e) => {
                  const m = e.target.value as HttpMethod;
                  setMethod(m);
                  setActivePresetId(null);
                }}
                className="border-input bg-background ring-offset-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="pg-path" className="text-sm font-medium">
                Path or full path + query
              </label>
              <Input
                id="pg-path"
                value={path}
                onChange={(e) => {
                  setPath(e.target.value);
                  setActivePresetId(null);
                }}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="pg-body" className={cn("text-sm font-medium", bodyDisabled && "text-muted-foreground")}>
              JSON body <span className="font-normal">(POST / PATCH)</span>
            </label>
            <textarea
              id="pg-body"
              disabled={bodyDisabled}
              aria-disabled={bodyDisabled}
              className={cn(
                "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[140px] w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                bodyDisabled && "cursor-not-allowed opacity-60",
              )}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setActivePresetId(null);
              }}
              placeholder='{"paymentHeader":"..."}'
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={loading} onClick={send} aria-busy={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending…
                </>
              ) : (
                `Send ${method}`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {(out || err) && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Response</CardTitle>
              <CardDescription>JSON bodies are pretty-printed when valid.</CardDescription>
            </div>
            {out ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => navigator.clipboard.writeText(out)}
              >
                <Copy className="mr-1.5 size-3.5" />
                Copy
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {err && <p className="text-sm text-destructive">{err}</p>}
            {out && (
              <pre className="max-h-[min(55vh,480px)] overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                {out}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
