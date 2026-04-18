import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  demoCookieDefaults,
  getDemoMerchantKey,
  getPaykitApiBase,
  walletCookieDeserialize,
} from "@/lib/demo/paykit-demo-api";

export const runtime = "nodejs";

const MAX_PROMPTS = 20;

async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token?.trim()) return false;
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const data = (await r.json()) as { success?: boolean };
  return data.success === true;
}

export async function POST(req: Request) {
  try {
    const jar = await cookies();
    const encoded = jar.get("paykit_demo_wallet")?.value;
    const legacyId = jar.get("paykit_demo_wallet_id")?.value;
    const parsedWallet = walletCookieDeserialize(encoded ?? undefined);
    const walletId = parsedWallet?.walletId ?? legacyId;
    if (!walletId) {
      return NextResponse.json(
        { error: "no_session", message: "Reload the page to provision a demo wallet." },
        { status: 400 },
      );
    }

    let count = parseInt(jar.get("paykit_demo_prompt_count")?.value ?? "0", 10);
    if (Number.isNaN(count)) count = 0;
    if (count >= MAX_PROMPTS) {
      return NextResponse.json(
        {
          error: "rate_limit",
          message: `Prompt limit reached. Wallet resets in the time shown in the policy chip.`,
          limit: MAX_PROMPTS,
        },
        { status: 429 },
      );
    }

    const body = (await req.json()) as {
      preset?: string;
      input?: { text?: string; target?: string; url?: string };
      turnstileToken?: string;
    };
    const preset = body.preset as "btc" | "translate" | "summarize" | "expensive" | undefined;
    if (!preset || !["btc", "translate", "summarize", "expensive"].includes(preset)) {
      return NextResponse.json({ error: "invalid_preset" }, { status: 400 });
    }

    if (count === 0) {
      const ok = await verifyTurnstile(body.turnstileToken);
      if (!ok) {
        return NextResponse.json(
          { error: "turnstile", message: "Complete the verification challenge." },
          { status: 400 },
        );
      }
    }

    const r = await fetch(`${getPaykitApiBase()}/v1/demo/prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getDemoMerchantKey(),
      },
      body: JSON.stringify({
        walletId,
        preset,
        input: body.input,
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return NextResponse.json(data, { status: r.status });
    }

    count += 1;
    const res = NextResponse.json(data);
    res.cookies.set("paykit_demo_prompt_count", String(count), demoCookieDefaults());
    if (count === 1) {
      res.cookies.set("paykit_demo_turnstile_ok", "1", demoCookieDefaults());
    }
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "prompt_error" },
      { status: 500 },
    );
  }
}
