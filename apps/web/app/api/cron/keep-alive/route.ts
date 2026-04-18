import { NextResponse } from "next/server";

/**
 * Vercel Cron pings the Render API to reduce cold starts (every 10m).
 * Configure CRON_SECRET on Vercel and Authorization: Bearer <secret> on scheduled requests if desired.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base =
    process.env.NEXT_PUBLIC_PAYKIT_API_URL?.trim().replace(/\/$/, "") ??
    process.env.PAYKIT_API_HEALTH_URL?.trim();

  if (!base) {
    return NextResponse.json({ ok: false, error: "NEXT_PUBLIC_PAYKIT_API_URL not set" }, { status: 503 });
  }

  try {
    const r = await fetch(`${base}/v1/x402/supported`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const ok = r.ok;
    const text = await r.text();
    return NextResponse.json({ ok, status: r.status, snippet: text.slice(0, 120) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "fetch failed" }, { status: 502 });
  }
}
