import { NextResponse } from "next/server";

import {
  fetchDemoWalletFromApi,
  jsonWalletCookieResponse,
} from "@/lib/demo/paykit-demo-api";

export const runtime = "nodejs";

export async function POST() {
  try {
    const r = await fetchDemoWalletFromApi();
    const data = (await r.json()) as {
      walletId?: string;
      cAddress?: string;
      expiresAt?: string;
      error?: string;
    };
    if (!r.ok) {
      return NextResponse.json(data, { status: r.status });
    }
    if (!data.walletId || !data.cAddress) {
      return NextResponse.json({ error: "missing_wallet" }, { status: 502 });
    }
    return jsonWalletCookieResponse({
      walletId: data.walletId,
      cAddress: data.cAddress,
      expiresAt: data.expiresAt,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "wallet_error" },
      { status: 500 },
    );
  }
}
