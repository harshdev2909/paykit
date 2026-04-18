import { NextResponse } from "next/server";

import { getPaykitApiBaseUrl } from "@/lib/paykit-client";

/** Prefer internal URL for server-side hops; otherwise same URL as browser (`paykit-client`). */
export function getPaykitApiBase(): string {
  const internal = process.env.PAYKIT_INTERNAL_API_URL?.trim();
  if (internal) return internal.replace(/\/$/, "");
  const base = getPaykitApiBaseUrl();
  if (!base) {
    throw new Error("NEXT_PUBLIC_PAYKIT_API_URL is not set");
  }
  return base;
}

export function getDemoMerchantKey(): string {
  const k = process.env.PAYKIT_DEMO_MERCHANT_API_KEY;
  if (!k) {
    throw new Error("PAYKIT_DEMO_MERCHANT_API_KEY is not set");
  }
  return k;
}

export function cookieFlags() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    path: "/" as const,
    sameSite: "lax" as const,
    secure,
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function fetchBootstrapFromApi(): Promise<Response> {
  return fetch(`${getPaykitApiBase()}/v1/demo/bootstrap`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getDemoMerchantKey(),
    },
    body: "{}",
  });
}

export function jsonBootstrapResponse(data: { walletId: string; publicKey?: string; policy?: unknown }) {
  const res = NextResponse.json(data);
  res.cookies.set("paykit_demo_wallet_id", data.walletId, cookieFlags());
  res.cookies.set("paykit_demo_prompt_count", "0", cookieFlags());
  return res;
}
