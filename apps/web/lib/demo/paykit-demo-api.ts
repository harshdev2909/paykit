import { NextResponse } from "next/server";

import { getPaykitApiBaseUrlOrFallback } from "@/lib/paykit-client";

/** Prefer internal URL for server-side hops; otherwise same URL as browser (`paykit-client`). */
export function getPaykitApiBase(): string {
  const internal = process.env.PAYKIT_INTERNAL_API_URL?.trim();
  if (internal) return internal.replace(/\/$/, "");
  return getPaykitApiBaseUrlOrFallback().replace(/\/$/, "");
}

export function getDemoMerchantKey(): string {
  const k = process.env.PAYKIT_DEMO_MERCHANT_API_KEY;
  if (!k) {
    throw new Error("PAYKIT_DEMO_MERCHANT_API_KEY is not set");
  }
  return k;
}

export type DemoWalletCookiePayload = {
  walletId: string;
  cAddress: string;
  issuedAt: string;
};

export function walletCookieSerialize(payload: DemoWalletCookiePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

export function walletCookieDeserialize(raw: string | undefined): DemoWalletCookiePayload | null {
  if (!raw?.trim()) return null;
  try {
    const buf = Buffer.from(raw, "base64url").toString("utf-8");
    const j = JSON.parse(buf) as DemoWalletCookiePayload;
    if (typeof j.walletId !== "string" || typeof j.cAddress !== "string") return null;
    if (!j.issuedAt) j.issuedAt = new Date().toISOString();
    return j;
  } catch {
    return null;
  }
}

/** httpOnly demo session cookies — path `/` so `/api/demo/*` route handlers receive them (path `/demo` alone would omit `/api`). */
export function demoCookieDefaults() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    path: "/" as const,
    sameSite: "lax" as const,
    secure,
    maxAge: 60 * 60 * 24,
  };
}

export async function fetchDemoWalletFromApi(): Promise<Response> {
  return fetch(`${getPaykitApiBase()}/v1/demo/wallet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

export function jsonWalletCookieResponse(data: {
  walletId: string;
  cAddress: string;
  expiresAt?: string;
}) {
  const issuedAt = new Date().toISOString();
  const res = NextResponse.json({
    walletId: data.walletId,
    cAddress: data.cAddress,
    expiresAt: data.expiresAt,
  });
  const payload: DemoWalletCookiePayload = {
    walletId: data.walletId,
    cAddress: data.cAddress,
    issuedAt,
  };
  const def = demoCookieDefaults();
  res.cookies.set("paykit_demo_wallet", walletCookieSerialize(payload), def);
  res.cookies.set("paykit_demo_prompt_count", "0", def);
  res.cookies.set("paykit_demo_wallet_id", "", { ...def, maxAge: 0 });
  return res;
}
