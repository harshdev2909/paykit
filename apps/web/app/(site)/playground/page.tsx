"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PlaygroundPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [path, setPath] = useState("/v1/x402/supported");
  const [body, setBody] = useState("");
  const [out, setOut] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBaseUrl(process.env.NEXT_PUBLIC_PAYKIT_API_URL || "http://localhost:3000");
  }, []);

  async function run(method: "GET" | "POST") {
    setLoading(true);
    setErr(null);
    setOut(null);
    try {
      const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(apiKey.trim() ? { "x-api-key": apiKey.trim() } : {}),
        },
        body: method === "POST" && body.trim() ? body : undefined,
      });
      const text = await res.text();
      setOut(`${res.status} ${res.statusText}\n\n${text}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl flex-1 space-y-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Playground</h1>
        <p className="mt-2 text-muted-foreground">
          Call the PayKit API from the browser. Set <code className="text-xs">NEXT_PUBLIC_PAYKIT_API_URL</code> in{" "}
          <code className="text-xs">.env.local</code> for a default base URL. Never paste production secrets into a
          shared machine.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request</CardTitle>
          <CardDescription>Defaults to GET /v1/x402/supported (no auth required).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="base" className="text-sm font-medium">
              Base URL
            </label>
            <Input
              id="base"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:3000"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="key" className="text-sm font-medium">
              API key (optional)
            </label>
            <Input
              id="key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="x-api-key"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="path" className="text-sm font-medium">
              Path
            </label>
            <Input id="path" value={path} onChange={(e) => setPath(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="body" className="text-sm font-medium">
              JSON body (POST only)
            </label>
            <textarea
              id="body"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{"paymentHeader":"..."}'
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={loading} onClick={() => run("GET")}>
              Send GET
            </Button>
            <Button type="button" variant="secondary" disabled={loading} onClick={() => run("POST")}>
              Send POST
            </Button>
          </div>
        </CardContent>
      </Card>

      {(out || err) && (
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
            <CardDescription>Raw body from the API.</CardDescription>
          </CardHeader>
          <CardContent>
            {err && <p className="text-sm text-destructive">{err}</p>}
            {out && (
              <pre className="max-h-[min(50vh,420px)] overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                {out}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
