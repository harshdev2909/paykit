import { NextResponse } from "next/server";

import { getDemoMerchantKey, getPaykitApiBase } from "@/lib/demo/paykit-demo-api";

export const runtime = "nodejs";

/** Recent receipts for the seeded demo merchant (hydrates the transaction log). */
export async function GET() {
  try {
    const r = await fetch(`${getPaykitApiBase()}/v1/receipts?limit=20`, {
      headers: { "x-api-key": getDemoMerchantKey() },
      cache: "no-store",
    });
    const data = await r.json();
    if (!r.ok) {
      return NextResponse.json(data, { status: r.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "receipts_error" },
      { status: 500 },
    );
  }
}
