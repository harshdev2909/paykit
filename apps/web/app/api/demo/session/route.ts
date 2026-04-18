import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDemoMerchantKey, getPaykitApiBase } from "@/lib/demo/paykit-demo-api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const jar = await cookies();
    const walletId = jar.get("paykit_demo_wallet_id")?.value ?? null;
    const promptCount = parseInt(jar.get("paykit_demo_prompt_count")?.value ?? "0", 10) || 0;
    if (!walletId) {
      return NextResponse.json({ ok: false, walletId: null as string | null, promptCount });
    }
    const r = await fetch(`${getPaykitApiBase()}/v1/wallets/${walletId}`, {
      headers: { "x-api-key": getDemoMerchantKey() },
      cache: "no-store",
    });
    if (!r.ok) {
      return NextResponse.json({
        ok: false,
        walletId,
        promptCount,
        error: "wallet_fetch_failed",
      });
    }
    const w = (await r.json()) as {
      publicKey?: string;
      agentPolicy?: Record<string, unknown>;
      balances?: { asset?: string; balance?: string }[];
      createdAt?: string;
    };
    const policy = w.agentPolicy ?? {};
    const demoWindowStart =
      typeof policy.demoWindowStart === "string"
        ? policy.demoWindowStart
        : (w.createdAt ?? new Date().toISOString());
    const demoSpentUsdc = typeof policy.demoSpentUsdc === "string" ? policy.demoSpentUsdc : "0";
    const dailyCap = typeof policy.dailyCap === "string" ? policy.dailyCap : "0.50";
    return NextResponse.json({
      ok: true,
      walletId,
      promptCount,
      publicKey: w.publicKey,
      demoWindowStart,
      demoSpentUsdc,
      dailyCap,
      balances: w.balances ?? [],
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "session_error" },
      { status: 500 },
    );
  }
}
