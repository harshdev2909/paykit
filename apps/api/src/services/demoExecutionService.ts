import { prisma } from "../lib/prisma";
import { Wallet } from "../database/models";
import { ensureSettlementWalletId } from "../merchant/merchantService";
import { getAgentWalletForMerchant, updateAgentWalletPolicy } from "./agentWalletService";
import { broadcastMerchantEvent } from "./phase3EventHub";
import { createReceipt } from "./receiptService";
import { submitWalletPayment } from "./stellarPayment";
import { config } from "../config";

export type ResolvedDemoPrompt = {
  label: string;
  pathSuffix: string;
  domain: string;
  amountUsdc: number;
  overspend: boolean;
};

export function resolveDemoPrompt(prompt: string): ResolvedDemoPrompt {
  const t = prompt.trim().toLowerCase();
  if (
    t.includes("spend $1") ||
    t.includes("exceeds cap") ||
    t.includes("try to spend") ||
    (t.includes("overspend") && t.includes("$"))
  ) {
    return {
      label: "Overspend (policy)",
      pathSuffix: "/overspend",
      domain: "api.demo.paykit.dev",
      amountUsdc: 1,
      overspend: true,
    };
  }
  if (t.includes("btc") || t.includes("bitcoin") || t.includes("price")) {
    return {
      label: "BTC price",
      pathSuffix: "/btc-price",
      domain: "api.demo.paykit.dev",
      amountUsdc: 0.02,
      overspend: false,
    };
  }
  if (t.includes("translate") || t.includes("japanese")) {
    return {
      label: "Translate",
      pathSuffix: "/translate",
      domain: "api.demo.paykit.dev",
      amountUsdc: 0.02,
      overspend: false,
    };
  }
  if (t.includes("summarize") || t.includes("ycombinator") || t.includes("hackernews")) {
    return {
      label: "Summarize",
      pathSuffix: "/summarize",
      domain: "api.demo.paykit.dev",
      amountUsdc: 0.03,
      overspend: false,
    };
  }
  return {
    label: "BTC price",
    pathSuffix: "/btc-price",
    domain: "api.demo.paykit.dev",
    amountUsdc: 0.02,
    overspend: false,
  };
}

function internalBase(): string {
  return process.env.PAYKIT_INTERNAL_URL ?? `http://127.0.0.1:${config.port}`;
}

function rollingWindow(agentPolicy: Record<string, unknown>): { windowStart: Date; spent: number } {
  const rawStart = agentPolicy.demoWindowStart;
  const rawSpent = agentPolicy.demoSpentUsdc;
  let windowStart =
    typeof rawStart === "string" && rawStart.length > 0 ? new Date(rawStart) : new Date();
  if (Number.isNaN(windowStart.getTime())) {
    windowStart = new Date();
  }
  const spentRaw = typeof rawSpent === "string" ? parseFloat(rawSpent || "0") : 0;
  const spent = Number.isFinite(spentRaw) ? spentRaw : 0;
  const elapsed = Date.now() - windowStart.getTime();
  const hours24 = 24 * 60 * 60 * 1000;
  if (elapsed >= hours24) {
    return { windowStart: new Date(), spent: 0 };
  }
  return { windowStart, spent };
}

export type DemoExecutionResult = {
  ok: boolean;
  receiptId?: string;
  failureReason?: string;
  resolved: ResolvedDemoPrompt;
  echo: {
    requestUrl: string;
    method402: string;
    status402: number;
    headers402: Record<string, string>;
    body402: string;
    paymentHeader: string;
    status200: number;
    body200: string;
  };
  stellar?: {
    txHash?: string;
    error?: string;
    pending?: boolean;
  };
  facilitator?: {
    verify: unknown;
    settleReceiptId?: string;
  };
  webhookDeliveries: {
    url: string;
    attemptCount: number;
    lastError: string | null;
    lastAttemptAt: string | null;
  }[];
};

async function fetchPayToAddress(merchantId: string): Promise<string> {
  const direct = config.demo.payToAddress;
  if (direct) return direct;
  const settleId = await ensureSettlementWalletId(merchantId);
  const settle = await Wallet.findById(settleId).select("publicKey").lean();
  return settle?.publicKey ?? "";
}

export async function executeDemoPrompt(opts: {
  merchantId: string;
  walletId: string;
  prompt: string;
  apiKey: string;
}): Promise<DemoExecutionResult> {
  const resolved = resolveDemoPrompt(opts.prompt);
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

  let { windowStart, spent } = rollingWindow(agentPolicy);

  const persistPolicy = async (next: Record<string, unknown>) => {
    await updateAgentWalletPolicy(opts.walletId, opts.merchantId, next);
  };

  async function failReceipt(reason: string): Promise<DemoExecutionResult> {
    const payToAddress = await fetchPayToAddress(opts.merchantId);
    const row = await createReceipt({
      merchantId: opts.merchantId,
      walletFrom: fromKey,
      walletTo: payToAddress || fromKey,
      asset: "USDC",
      amount: resolved.amountUsdc.toFixed(7),
      domain: resolved.domain,
      path: resolved.pathSuffix,
      status: "failed",
      signedReceipt: JSON.stringify({ reason }),
    });

    const payload: DemoExecutionResult = {
      ok: false,
      receiptId: row.id,
      failureReason: reason,
      resolved,
      echo: {
        requestUrl: `${internalBase()}/demo/echo${resolved.pathSuffix}`,
        method402: "GET",
        status402: 402,
        headers402: {},
        body402: "",
        paymentHeader: "",
        status200: 0,
        body200: "",
      },
      webhookDeliveries: [],
    };

    broadcastMerchantEvent(opts.merchantId, {
      type: "demo.transaction",
      receiptId: row.id,
      status: "failed",
      amount: resolved.amountUsdc.toFixed(7),
      asset: "USDC",
      domain: resolved.domain,
      path: resolved.pathSuffix,
      label: resolved.label,
      failureReason: reason,
    });

    return payload;
  }

  if (!allowedDomains.includes("api.demo.paykit.dev")) {
    return failReceipt("Domain api.demo.paykit.dev is not in this wallet allowlist.");
  }

  if (resolved.overspend || resolved.amountUsdc > dailyCap) {
    return failReceipt(
      `Spending policy rejected this payment ($${resolved.amountUsdc.toFixed(2)} exceeds the $${dailyCap.toFixed(2)} daily cap).`,
    );
  }

  if (spent + resolved.amountUsdc > dailyCap + 1e-9) {
    return failReceipt(
      `Daily cap exhausted ($${spent.toFixed(2)} spent of $${dailyCap.toFixed(2)} USDC in the current window).`,
    );
  }

  const payToAddress = await fetchPayToAddress(opts.merchantId);
  if (!payToAddress) {
    return failReceipt("Missing receive address — set PAYKIT_DEMO_PAY_TO or provision a settlement wallet.");
  }

  const echoUrl = `${internalBase()}/demo/echo${resolved.pathSuffix}`;
  const r1 = await fetch(echoUrl, { method: "GET" });
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
      resource: `https://${config.demo.resourceHost}${resolved.pathSuffix}`,
    }),
    "utf-8",
  ).toString("base64");

  const r2 = await fetch(echoUrl, {
    method: "GET",
    headers: {
      "X-PAYMENT": paymentHeader,
    },
  });
  const body200 = await r2.text();

  let txHash: string | undefined;
  let stellarError: string | undefined;

  try {
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
      path: resolved.pathSuffix,
      status: "failed",
      signedReceipt: JSON.stringify({ reason: stellarError }),
    });

    broadcastMerchantEvent(opts.merchantId, {
      type: "demo.transaction",
      receiptId: row.id,
      status: "failed",
      failureReason: stellarError,
      domain: resolved.domain,
      path: resolved.pathSuffix,
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
      resolved,
      echo: {
        requestUrl: echoUrl,
        method402: "GET",
        status402: r1.status,
        headers402,
        body402,
        paymentHeader,
        status200: r2.status,
        body200,
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
        resource: `https://${config.demo.resourceHost}${resolved.pathSuffix}`,
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
    path: resolved.pathSuffix,
    x402Nonce: `demo-${Date.now()}`,
    stellarTxHash: txHash,
    signedReceipt: paymentHeader,
    status: "settled",
  });

  const newSpent = spent + resolved.amountUsdc;
  await persistPolicy({
    ...agentPolicy,
    dailyCap: String(agentPolicy.dailyCap ?? "0.50"),
    allowedDomains: allowedDomains.length ? allowedDomains : ["api.demo.paykit.dev"],
    demoWindowStart: windowStart.toISOString(),
    demoSpentUsdc: newSpent.toFixed(6),
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
    path: resolved.pathSuffix,
    label: resolved.label,
    stellarTxHash: txHash,
  });

  return {
    ok: true,
    receiptId: row.id,
    resolved,
    echo: {
      requestUrl: echoUrl,
      method402: "GET",
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
