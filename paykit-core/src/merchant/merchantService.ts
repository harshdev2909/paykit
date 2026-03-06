import crypto from "crypto";
import { Merchant, MerchantBalance, CheckoutSession, PaymentLink, Transaction } from "../database/models";
import { Wallet } from "../database/models";
import { createWallet } from "../wallet/walletService";
import { getWalletWithBalances } from "../wallet/walletService";
import { getStellarAdapter } from "../chains/StellarAdapter";
import { establishTrustline } from "../services/trustlineService";
import { config } from "../config";

function generateApiKey(): string {
  return `pk_${config.nodeEnv === "production" ? "live" : "test"}_${crypto.randomBytes(24).toString("hex")}`;
}

function generateSlug(): string {
  return crypto.randomBytes(10).toString("base64url");
}

export async function createMerchant(name: string, webhookUrl?: string): Promise<{
  id: string;
  name: string;
  apiKey: string;
  webhookUrl?: string;
  createdAt: Date;
}> {
  const apiKey = generateApiKey();
  const merchant = await Merchant.create({
    name,
    apiKey,
    webhookUrl: webhookUrl ?? undefined,
    maxPaymentAmount: config.merchant.defaultMaxPaymentAmount,
  });
  return {
    id: merchant._id.toString(),
    name: merchant.name,
    apiKey: merchant.apiKey,
    webhookUrl: merchant.webhookUrl,
    createdAt: merchant.createdAt,
  };
}

export async function getMerchantById(id: string): Promise<{
  id: string;
  name: string;
  webhookUrl?: string;
  createdAt: Date;
} | null> {
  const m = await Merchant.findById(id).select("name webhookUrl createdAt").lean().exec();
  if (!m) return null;
  return {
    id: m._id.toString(),
    name: m.name,
    webhookUrl: m.webhookUrl,
    createdAt: m.createdAt,
  };
}

export async function getMerchantByApiKey(apiKey: string): Promise<{ id: string; name: string } | null> {
  const m = await Merchant.findOne({ apiKey }).select("_id name").lean().exec();
  if (!m) return null;
  return { id: m._id.toString(), name: m.name };
}

export async function ensureSettlementWalletId(merchantId: string): Promise<string> {
  const merchant = await Merchant.findById(merchantId).exec();
  if (!merchant) throw new Error("Merchant not found");
  if (merchant.settlementWalletId) {
    return merchant.settlementWalletId.toString();
  }
  const adapter = getStellarAdapter();
  const result = await adapter.createWallet();
  await Merchant.updateOne(
    { _id: merchantId },
    { $set: { settlementWalletId: result.walletId } }
  ).exec();
  // So we can receive USDC (and PYUSD) when checkouts are settled
  try {
    await establishTrustline(result.walletId, "USDC");
  } catch (err) {
    console.error("[merchant] USDC trustline failed for settlement wallet", result.walletId, err);
  }
  if (config.stellar.pyusdIssuer) {
    try {
      await establishTrustline(result.walletId, "PYUSD");
    } catch (err) {
      console.warn("[merchant] PYUSD trustline failed for settlement wallet", result.walletId, err);
    }
  }
  return result.walletId;
}

export async function getMerchantWallet(merchantId: string): Promise<{
  walletId: string;
  publicKey: string;
  balances: Array<{ asset: string; balance: string }>;
} | null> {
  const walletId = await ensureSettlementWalletId(merchantId);
  const wallet = await getWalletWithBalances(walletId);
  if (!wallet) return null;
  return {
    walletId: wallet.id,
    publicKey: wallet.publicKey,
    balances: wallet.balances.map((b) => ({ asset: b.asset, balance: b.balance })),
  };
}

function checkMaxPayment(merchant: { maxPaymentAmount?: string }, amount: string): void {
  const max = merchant.maxPaymentAmount ? parseFloat(merchant.maxPaymentAmount) : undefined;
  if (max !== undefined && parseFloat(amount) > max) {
    throw new Error(`Amount exceeds merchant maximum allowed (${max})`);
  }
}

export async function createPaymentLink(merchantId: string, amount: string, asset: string, description?: string): Promise<{
  paymentLink: string;
  slug: string;
  id: string;
}> {
  const merchant = await Merchant.findById(merchantId).exec();
  if (!merchant) throw new Error("Merchant not found");
  checkMaxPayment(merchant, amount);
  const slug = generateSlug();
  const link = await PaymentLink.create({
    merchantId: merchant._id,
    amount,
    asset,
    description,
    slug,
    active: true,
  });
  const base = config.merchant.baseUrl.replace(/\/$/, "");
  return {
    paymentLink: `${base}/pay/${link.slug}`,
    slug: link.slug,
    id: link._id.toString(),
  };
}

const CHECKOUT_EXPIRY_HOURS = 24;

export async function createCheckoutSession(params: {
  merchantId: string;
  amount: string;
  asset: string;
  successUrl?: string;
  cancelUrl?: string;
  description?: string;
  autoYield?: boolean;
}): Promise<{
  id: string;
  walletAddress: string;
  amount: string;
  asset: string;
  status: string;
  expiresAt: string;
}> {
  const merchant = await Merchant.findById(params.merchantId).exec();
  if (!merchant) throw new Error("Merchant not found");
  checkMaxPayment(merchant, params.amount);
  const adapter = getStellarAdapter();
  const walletResult = await adapter.createWallet();
  const expiresAt = new Date(Date.now() + CHECKOUT_EXPIRY_HOURS * 60 * 60 * 1000);
  const wallet = await Wallet.findById(walletResult.walletId).exec();
  if (!wallet) throw new Error("Wallet not created");
  // So the customer can send USDC/PYUSD: establish trustline for issued assets (avoids op_no_trust)
  const assetUpper = params.asset.toUpperCase();
  if (assetUpper !== "XLM") {
    try {
      await establishTrustline(walletResult.walletId, params.asset);
    } catch (err) {
      console.error("[checkout] trustline establishment failed", walletResult.walletId, params.asset, err);
      throw new Error(
        `Could not enable receiving ${params.asset} on checkout wallet. ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  const session = await CheckoutSession.create({
    merchantId: merchant._id,
    amount: params.amount,
    asset: params.asset,
    status: "open",
    walletId: wallet._id,
    walletAddress: walletResult.address,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
    description: params.description,
    autoYield: params.autoYield ?? false,
    expiresAt,
  });
  return {
    id: session._id.toString(),
    walletAddress: session.walletAddress,
    amount: session.amount,
    asset: session.asset,
    status: session.status,
    expiresAt: session.expiresAt.toISOString(),
  };
}

export async function creditMerchantBalance(
  merchantId: string,
  asset: string,
  amount: string,
  assetIssuer?: string
): Promise<void> {
  const key = { merchantId, asset, assetIssuer: assetIssuer ?? undefined };
  const existing = await MerchantBalance.findOne(key).lean().exec();
  const current = existing ? parseFloat(existing.balance) : 0;
  const newBalance = (current + parseFloat(amount)).toFixed(7);
  await MerchantBalance.findOneAndUpdate(
    key,
    { $set: { balance: newBalance, merchantId, asset, assetIssuer: assetIssuer ?? undefined } },
    { upsert: true }
  ).exec();
}

export async function getMerchantBalances(merchantId: string): Promise<{ asset: string; balance: string }[]> {
  const rows = await MerchantBalance.find({ merchantId }).lean().exec();
  return rows.map((r) => ({ asset: r.asset, balance: r.balance }));
}

export async function getMerchantBalanceForAsset(merchantId: string, asset: string): Promise<string> {
  const row = await MerchantBalance.findOne({ merchantId, asset }).lean().exec();
  return row?.balance ?? "0";
}

export async function debitMerchantBalance(merchantId: string, asset: string, amount: string): Promise<void> {
  const current = await getMerchantBalanceForAsset(merchantId, asset);
  const newBalance = parseFloat(current) - parseFloat(amount);
  if (newBalance < 0) throw new Error("Insufficient merchant balance");
  await MerchantBalance.findOneAndUpdate(
    { merchantId, asset },
    { $set: { balance: newBalance.toFixed(7) } }
  ).exec();
}

export async function executeMerchantPayout(params: {
  merchantId: string;
  destination: string;
  asset: string;
  amount: string;
}): Promise<{ txHash: string }> {
  const merchant = await Merchant.findById(params.merchantId).exec();
  if (!merchant) throw new Error("Merchant not found");
  const maxAmount = merchant.maxPaymentAmount ? parseFloat(merchant.maxPaymentAmount) : undefined;
  if (maxAmount !== undefined && parseFloat(params.amount) > maxAmount) {
    const { RiskEvent } = await import("../database/models");
    await RiskEvent.create({
      merchantId: merchant._id,
      type: "max_amount_exceeded",
      payload: { amount: params.amount, max: maxAmount, destination: params.destination },
    });
    throw new Error(`Amount exceeds maximum allowed (${maxAmount})`);
  }
  const settlementWalletId = await ensureSettlementWalletId(params.merchantId);
  const walletWithBalances = await getWalletWithBalances(settlementWalletId);
  if (!walletWithBalances) throw new Error("Merchant settlement wallet not found");
  const walletBalanceForAsset = walletWithBalances.balances.find((b) => b.asset === params.asset);
  const availableOnChain = walletBalanceForAsset
    ? parseFloat(walletBalanceForAsset.balance)
    : 0;
  if (availableOnChain < parseFloat(params.amount)) {
    throw new Error(
      `Insufficient wallet balance. Available: ${availableOnChain.toFixed(7)} ${params.asset}, requested: ${params.amount}`
    );
  }
  const bookBalance = await getMerchantBalanceForAsset(params.merchantId, params.asset);
  const bookNum = parseFloat(bookBalance);
  const amountNum = parseFloat(params.amount);
  const debitAmount = Math.min(amountNum, Math.max(0, bookNum));
  if (debitAmount > 0) {
    await debitMerchantBalance(params.merchantId, params.asset, debitAmount.toFixed(7));
  }
  const { routePayment } = await import("../services/paymentRouter");
  const result = await routePayment({
    fromWalletId: settlementWalletId,
    toAddress: params.destination,
    asset: params.asset,
    amount: params.amount,
  });
  await Transaction.findOneAndUpdate(
    { txHash: result.txHash },
    {
      $set: {
        txHash: result.txHash,
        fromWallet: walletWithBalances.publicKey,
        toWallet: params.destination,
        assetCode: params.asset,
        amount: params.amount,
        status: "success",
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  ).exec();
  return { txHash: result.txHash };
}

export async function getMerchantWalletTransactions(
  merchantId: string,
  limit: number
): Promise<
  { id: string; txHash: string; fromWallet: string; toWallet: string; assetCode: string; amount: string; status: string; createdAt: Date }[]
> {
  const settlementWalletId = await ensureSettlementWalletId(merchantId);
  const wallet = await Wallet.findById(settlementWalletId).select("publicKey").lean().exec();
  if (!wallet) return [];
  const list = await Transaction.find({
    $or: [{ fromWallet: wallet.publicKey }, { toWallet: wallet.publicKey }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();
  return list.map((t) => ({
    id: String(t._id),
    txHash: t.txHash,
    fromWallet: t.fromWallet,
    toWallet: t.toWallet,
    assetCode: t.assetCode,
    amount: t.amount,
    status: t.status,
    createdAt: t.createdAt,
  }));
}

export async function getMerchantPayments(
  merchantId: string,
  limit: number
): Promise<{ id: string; amount: string; asset: string; txHash?: string; completedAt: Date; status: string }[]> {
  const sessions = await CheckoutSession.find({ merchantId, status: "completed" })
    .sort({ completedAt: -1 })
    .limit(limit)
    .lean()
    .exec();
  return sessions.map((s) => ({
    id: s._id.toString(),
    amount: s.amount,
    asset: s.asset,
    txHash: s.txHash,
    completedAt: s.completedAt!,
    status: s.status,
  }));
}

export async function getMerchantAnalytics(merchantId: string): Promise<{
  totalVolume: string;
  totalTransactions: number;
  assetBreakdown: { asset: string; volume: string; count: number }[];
}> {
  const sessions = await CheckoutSession.find({ merchantId, status: "completed" }).lean().exec();
  let totalVolume = 0;
  const byAsset: Record<string, { volume: number; count: number }> = {};
  for (const s of sessions) {
    const amt = parseFloat(s.amount);
    totalVolume += amt;
    const a = s.asset;
    if (!byAsset[a]) byAsset[a] = { volume: 0, count: 0 };
    byAsset[a].volume += amt;
    byAsset[a].count += 1;
  }
  const assetBreakdown = Object.entries(byAsset).map(([asset, v]) => ({
    asset,
    volume: v.volume.toFixed(7),
    count: v.count,
  }));
  return {
    totalVolume: totalVolume.toFixed(7),
    totalTransactions: sessions.length,
    assetBreakdown,
  };
}
