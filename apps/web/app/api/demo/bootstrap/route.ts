import { NextResponse } from "next/server";
import {
  fetchBootstrapFromApi,
  jsonBootstrapResponse,
} from "@/lib/demo/paykit-demo-api";

export const runtime = "nodejs";

export async function POST() {
  try {
    const r = await fetchBootstrapFromApi();
    const data = (await r.json()) as { walletId?: string; publicKey?: string; policy?: unknown; error?: string };
    if (!r.ok) {
      return NextResponse.json(data, { status: r.status });
    }
    if (!data.walletId) {
      return NextResponse.json({ error: "missing_wallet" }, { status: 502 });
    }
    return jsonBootstrapResponse(data as { walletId: string; publicKey?: string; policy?: unknown });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "bootstrap_error" },
      { status: 500 },
    );
  }
}
