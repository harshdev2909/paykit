import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Lightweight first-party demo funnel events (no third-party trackers). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { event?: string; [k: string]: unknown };
    if (!body.event || typeof body.event !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    console.info("[demo-analytics]", JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
