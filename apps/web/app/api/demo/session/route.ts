import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getDemoMerchantKey, getPaykitApiBase, walletCookieDeserialize } from "@/lib/demo/paykit-demo-api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const jar = await cookies();
    const encoded = jar.get("paykit_demo_wallet")?.value;
    const legacyId = jar.get("paykit_demo_wallet_id")?.value;
    const parsed = walletCookieDeserialize(encoded ?? undefined);
    const walletId = parsed?.walletId ?? legacyId ?? null;
    const walletIssuedAt = parsed?.issuedAt;
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
    const demoPromptCountRaw = policy.demoPromptCount;
    const demoPromptCount =
      typeof demoPromptCountRaw === "string"
        ? parseInt(demoPromptCountRaw, 10)
        : typeof demoPromptCountRaw === "number"
          ? demoPromptCountRaw
          : promptCount;
    return NextResponse.json({
      ok: true,
      walletId,
      cAddress: w.publicKey ?? parsed?.cAddress,
      walletIssuedAt: walletIssuedAt ?? demoWindowStart,
      promptCount,
      demoPromptCount: Number.isFinite(demoPromptCount) ? demoPromptCount : promptCount,
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
