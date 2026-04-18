import { prisma } from "../lib/prisma";
import { Wallet } from "../database/models";
import { ensureSettlementWalletId } from "../merchant/merchantService";
import { getAgentWalletForMerchant, updateAgentWalletPolicy } from "./agentWalletService";
import { broadcastMerchantEvent } from "./phase3EventHub";
import { createReceipt } from "./receiptService";
import { submitWalletPayment } from "./stellarPayment";
import { ensureDemoNativeTopUp, ensureDemoUsdcTopUpFromSettlement } from "./demoWalletFunding";
import { ensureTrustlineIfNeeded } from "./trustlineService";
import { config } from "../config";

const DEMO_DOMAIN = config.demo.resourceHost;

export type DemoPreset = "btc" | "translate" | "summarize" | "expensive";

export type ResolvedDemoAction = {
  label: string;
  method: "GET" | "POST";
  path: string;
  domain: string;
  amountUsdc: number;
  overspend: boolean;
  postBody?: Record<string, unknown>;
};

export type DemoExecutionResult =
  | {
      ok: true;
      receiptId: string;
      /** Duplicate of stellar.txHash for thin clients / JSON edges. */
      stellarTxHash?: string;
      preset: DemoPreset;
      resolved: ResolvedDemoAction;
      resourceResult: unknown;
      echo: EchoCapture;
      stellar?: { txHash?: string; error?: string };
      facilitator?: { verify: unknown; settleReceiptId?: string };
      webhookDeliveries: WebhookDeliveryRow[];
    }
  | {
      ok: false;
      status: "rejected";
      reason: "daily_cap_exceeded" | "domain_not_allowed";
      attempted: string;
      receiptId?: string;
      failureReason: string;
      preset: DemoPreset;
      resolved: ResolvedDemoAction;
      echo: EchoCapture;
      webhookDeliveries: WebhookDeliveryRow[];
    }
  | {
      ok: false;
      receiptId?: string;
      failureReason: string;
      preset: DemoPreset;
      resolved: ResolvedDemoAction;
      echo: EchoCapture;
      stellar?: { txHash?: string; error?: string };
      facilitator?: { verify: unknown };
      webhookDeliveries: WebhookDeliveryRow[];
    };

type EchoCapture = {
  requestUrl: string;
  method402: string;
  status402: number;
  headers402: Record<string, string>;
  body402: string;
  paymentHeader: string;
  status200: number;
  body200: string;
};

type WebhookDeliveryRow = {
  url: string;
  attemptCount: number;
  lastError: string | null;
  lastAttemptAt: string | null;
};

export function resolveDemoPreset(
  preset: DemoPreset,
  input?: { text?: string; target?: string; url?: string },
): ResolvedDemoAction {
  switch (preset) {
    case "btc":
      return {
        label: "BTC price",
        method: "GET",
        path: "/_demo/btc",
        domain: DEMO_DOMAIN,
        amountUsdc: 0.01,
        overspend: false,
      };
    case "translate":
      return {
        label: "Translate",
        method: "POST",
        path: "/_demo/translate",
        domain: DEMO_DOMAIN,
        amountUsdc: 0.02,
        overspend: false,
        postBody: {
          text: input?.text ?? "hello",
          target: input?.target ?? "ja",
        },
      };
    case "summarize":
      return {
        label: "Summarize",
        method: "POST",
        path: "/_demo/summarize",
        domain: DEMO_DOMAIN,
        amountUsdc: 0.05,
        overspend: false,
        postBody: {
          url: input?.url ?? "https://news.ycombinator.com",
        },
      };
    case "expensive":
      return {
        label: "Expensive route",
        method: "GET",
        path: "/_demo/expensive",
        domain: DEMO_DOMAIN,
        amountUsdc: 1.0,
        overspend: true,
      };
    default: {
      const _x: never = preset;
      return _x;
    }
  }
}

function internalBase(): string {
  return process.env.PAYKIT_INTERNAL_URL ?? `http://127.0.0.1:${config.port}`;
}

function rollDemoState(agentPolicy: Record<string, unknown>): {
  windowStart: Date;
  spent: number;
  promptCount: number;
} {
  const rawStart = agentPolicy.demoWindowStart;
  const rawSpent = agentPolicy.demoSpentUsdc;
  const rawPrompts = agentPolicy.demoPromptCount;
  let windowStart =
    typeof rawStart === "string" && rawStart.length > 0 ? new Date(rawStart) : new Date();
  if (Number.isNaN(windowStart.getTime())) {
    windowStart = new Date();
  }
  const spentRaw = typeof rawSpent === "string" ? parseFloat(rawSpent || "0") : 0;
  const spent = Number.isFinite(spentRaw) ? spentRaw : 0;
  const promptCountRaw =
    typeof rawPrompts === "string" ? parseInt(rawPrompts || "0", 10) : typeof rawPrompts === "number" ? rawPrompts : 0;
  const promptCount = Number.isFinite(promptCountRaw) ? promptCountRaw : 0;
  const elapsed = Date.now() - windowStart.getTime();
  const hours24 = 24 * 60 * 60 * 1000;
  if (elapsed >= hours24) {
    return { windowStart: new Date(), spent: 0, promptCount: 0 };
  }
  return { windowStart, spent, promptCount };
}

async function fetchPayToAddress(merchantId: string): Promise<string> {
  const direct = config.demo.payToAddress;
  if (direct) return direct;
  const settleId = await ensureSettlementWalletId(merchantId);
  const settle = await Wallet.findById(settleId).select("publicKey").lean();
  return settle?.publicKey ?? "";
}

function mapRejectionReason(msg: string): "daily_cap_exceeded" | "domain_not_allowed" {
  const m = msg.toLowerCase();
  if (m.includes("domain") || m.includes("allowlist")) return "domain_not_allowed";
  return "daily_cap_exceeded";
}

export async function executeDemoPrompt(opts: {
  merchantId: string;
  walletId: string;
  preset: DemoPreset;
  input?: { text?: string; target?: string; url?: string };
  apiKey: string;
}): Promise<DemoExecutionResult> {
  const resolved = resolveDemoPreset(opts.preset, opts.input);
  const walletRow = await getAgentWalletForMerchant(opts.walletId, opts.merchantId);
  if (!walletRow) {
    throw new Error("Wallet not found");
  }
  const fromKey = walletRow.publicKey;

  const walletDoc = await Wallet.findById(opts.walletId).exec();
  if (!walletDoc) throw new Error("Wallet not found");
  const agentPolicy = { ...(walletDoc.agentPolicy ?? {}) } as Record<string, unknown>;

  const dailyCap = parseFloat(String(agentPolicy.dailyCap ?? "0.50"));
  const allowedDomains = Array.isArray(agentPolicy.allowedDomains)
    ? (agentPolicy.allowedDomains as string[])
    : [];

  let { windowStart, spent } = rollDemoState(agentPolicy);
  const oldWindowMs =
    typeof agentPolicy.demoWindowStart === "string"
      ? new Date(agentPolicy.demoWindowStart).getTime()
      : NaN;
  const spendingWindowExpired =
    Number.isFinite(oldWindowMs) && Date.now() - oldWindowMs >= 24 * 60 * 60 * 1000;

  const persistPolicy = async (next: Record<string, unknown>) => {
    await updateAgentWalletPolicy(opts.walletId, opts.merchantId, next);
  };

  async function failReceipt(
    reason: string,
    kind: "rejected" | "error",
  ): Promise<DemoExecutionResult> {
    const payToAddress = await fetchPayToAddress(opts.merchantId);
    const row = await createReceipt({
      merchantId: opts.merchantId,
      walletFrom: fromKey,
      walletTo: payToAddress || fromKey,
      asset: "USDC",
      amount: resolved.amountUsdc.toFixed(7),
      domain: resolved.domain,
      path: resolved.path,
      status: "failed",
      signedReceipt: JSON.stringify({ reason, kind }),
    });

    const echo: EchoCapture = {
      requestUrl: `${internalBase()}${resolved.path}`,
      method402: resolved.method,
      status402: 402,
      headers402: {},
      body402: "",
      paymentHeader: "",
      status200: 0,
      body200: "",
    };

    const payloadBase = {
      receiptId: row.id,
      failureReason: reason,
      preset: opts.preset,
      resolved,
      echo,
      webhookDeliveries: [] as WebhookDeliveryRow[],
    };

    broadcastMerchantEvent(opts.merchantId, {
      type: "demo.transaction",
      receiptId: row.id,
      status: "failed",
      amount: resolved.amountUsdc.toFixed(7),
      asset: "USDC",
      domain: resolved.domain,
      path: resolved.path,
      label: resolved.label,
      failureReason: reason,
    });

    if (kind === "rejected") {
      return {
        ok: false,
        status: "rejected",
        reason: mapRejectionReason(reason),
        attempted: resolved.amountUsdc.toFixed(2),
        ...payloadBase,
      };
    }

    return {
      ok: false,
      ...payloadBase,
    };
  }

  if (!allowedDomains.includes(DEMO_DOMAIN)) {
    return failReceipt(`${DEMO_DOMAIN} is not in this wallet allowlist.`, "rejected");
  }

  if (resolved.overspend || resolved.amountUsdc > dailyCap + 1e-9) {
    return failReceipt(
      `Spending policy rejected this payment ($${resolved.amountUsdc.toFixed(2)} exceeds the $${dailyCap.toFixed(2)} daily cap).`,
      "rejected",
    );
  }

  if (spent + resolved.amountUsdc > dailyCap + 1e-9) {
    return failReceipt(
      `Daily cap exhausted ($${spent.toFixed(2)} spent of $${dailyCap.toFixed(2)} USDC in the current window).`,
      "rejected",
    );
  }

  const payToAddress = await fetchPayToAddress(opts.merchantId);
  if (!payToAddress) {
    return failReceipt("Missing receive address — set PAYKIT_DEMO_PAY_TO or provision a settlement wallet.", "error");
  }

  const echoUrl = `${internalBase()}${resolved.path}`;
  const initFetch: RequestInit =
    resolved.method === "POST"
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resolved.postBody ?? {}),
        }
      : { method: "GET" };

  const r1 = await fetch(echoUrl, initFetch);
  const headers402: Record<string, string> = {};
  r1.headers.forEach((v, k) => {
    headers402[k] = v;
  });
  const body402 = await r1.text();

  const paymentHeader = Buffer.from(
    JSON.stringify({
      scheme: "demo-ed25519",
      network: `stellar:${config.stellar.network}`,
      ts: Date.now(),
      resource: `https://${config.demo.resourceHost}${resolved.path}`,
    }),
    "utf-8",
  ).toString("base64");

  let txHash: string | undefined;
  let stellarError: string | undefined;

  try {
    await ensureDemoNativeTopUp(opts.walletId, opts.merchantId);
    await ensureTrustlineIfNeeded(opts.walletId, "USDC");
    await ensureDemoUsdcTopUpFromSettlement(opts.walletId, opts.merchantId, resolved.amountUsdc);
    const pay = await submitWalletPayment({
      fromWalletId: opts.walletId,
      toAddress: payToAddress,
      asset: "USDC",
      amount: resolved.amountUsdc.toFixed(7),
    });
    txHash = pay.txHash;
  } catch (e) {
    stellarError = e instanceof Error ? e.message : String(e);
    const row = await createReceipt({
      merchantId: opts.merchantId,
      walletFrom: fromKey,
      walletTo: payToAddress,
      asset: "USDC",
      amount: resolved.amountUsdc.toFixed(7),
      domain: resolved.domain,
      path: resolved.path,
      status: "failed",
      signedReceipt: JSON.stringify({ reason: stellarError }),
    });

    broadcastMerchantEvent(opts.merchantId, {
      type: "demo.transaction",
      receiptId: row.id,
      status: "failed",
      failureReason: stellarError,
      domain: resolved.domain,
      path: resolved.path,
      label: resolved.label,
    });

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { receiptId: row.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return {
      ok: false,
      receiptId: row.id,
      failureReason: stellarError,
      preset: opts.preset,
      resolved,
      echo: {
        requestUrl: echoUrl,
        method402: resolved.method,
        status402: r1.status,
        headers402,
        body402,
        paymentHeader,
        status200: 0,
        body200: "",
      },
      stellar: { error: stellarError },
      facilitator: { verify: undefined },
      webhookDeliveries: deliveries.map((d) => ({
        url: d.url,
        attemptCount: d.attemptCount,
        lastError: d.lastError,
        lastAttemptAt: d.lastAttemptAt?.toISOString() ?? null,
      })),
    };
  }

  const secondInit: RequestInit =
    resolved.method === "POST"
      ? {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": paymentHeader,
          },
          body: JSON.stringify(resolved.postBody ?? {}),
        }
      : {
          method: "GET",
          headers: {
            "X-PAYMENT": paymentHeader,
          },
        };

  const r2 = await fetch(echoUrl, secondInit);
  const body200 = await r2.text();
  let resourceJson: unknown;
  try {
    resourceJson = JSON.parse(body200) as unknown;
  } catch {
    resourceJson = body200;
  }

  let verifyJson: unknown;
  try {
    const verifyRes = await fetch(`${internalBase()}/v1/x402/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": opts.apiKey,
      },
      body: JSON.stringify({
        paymentHeader,
        domain: resolved.domain,
        resource: `https://${config.demo.resourceHost}${resolved.path}`,
      }),
    });
    verifyJson = await verifyRes.json();
  } catch {
    verifyJson = { error: "verify_request_failed" };
  }

  const row = await createReceipt({
    merchantId: opts.merchantId,
    walletFrom: fromKey,
    walletTo: payToAddress,
    asset: "USDC",
    amount: resolved.amountUsdc.toFixed(7),
    domain: resolved.domain,
    path: resolved.path,
    x402Nonce: `demo-${Date.now()}`,
    stellarTxHash: txHash,
    signedReceipt: paymentHeader,
    status: "settled",
  });

  const newSpent = spent + resolved.amountUsdc;
  await persistPolicy({
    ...agentPolicy,
    dailyCap: String(agentPolicy.dailyCap ?? "0.50"),
    allowedDomains: allowedDomains.length ? allowedDomains : [DEMO_DOMAIN],
    demoWindowStart: windowStart.toISOString(),
    demoSpentUsdc: newSpent.toFixed(6),
    ...(spendingWindowExpired ? { demoPromptCount: "0" } : {}),
  });

  const deliveries = await prisma.webhookDelivery.findMany({
    where: { receiptId: row.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  broadcastMerchantEvent(opts.merchantId, {
    type: "demo.transaction",
    receiptId: row.id,
    status: "settled",
    amount: resolved.amountUsdc.toFixed(7),
    asset: "USDC",
    domain: resolved.domain,
    path: resolved.path,
    label: resolved.label,
    stellarTxHash: txHash,
  });

  return {
    ok: true,
    receiptId: row.id,
    stellarTxHash: txHash,
    preset: opts.preset,
    resolved,
    resourceResult: resourceJson,
    echo: {
      requestUrl: echoUrl,
      method402: resolved.method,
      status402: r1.status,
      headers402,
      body402,
      paymentHeader,
      status200: r2.status,
      body200,
    },
    stellar: { txHash },
    facilitator: {
      verify: verifyJson,
      settleReceiptId: row.id,
    },
    webhookDeliveries: deliveries.map((d) => ({
      url: d.url,
      attemptCount: d.attemptCount,
      lastError: d.lastError,
      lastAttemptAt: d.lastAttemptAt?.toISOString() ?? null,
    })),
  };
}
