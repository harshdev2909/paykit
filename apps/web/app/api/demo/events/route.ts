import { getDemoMerchantKey, getPaykitApiBase } from "@/lib/demo/paykit-demo-api";

export const runtime = "nodejs";

/** Proxies merchant SSE so the browser does not need the demo API key. */
export async function GET() {
  try {
    const upstream = await fetch(`${getPaykitApiBase()}/events/stream`, {
      headers: { "x-api-key": getDemoMerchantKey() },
      cache: "no-store",
    });
    if (!upstream.ok || !upstream.body) {
      return new Response(upstream.statusText || "upstream_error", { status: upstream.status });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response("stream_error", { status: 502 });
  }
}
