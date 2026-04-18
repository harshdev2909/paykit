import crypto from "crypto";
import { Merchant, CheckoutSession, Wallet } from "../database/models";
import { createWallet } from "../wallet/walletService";
import { establishTrustline } from "../services/trustlineService";
import { config } from "../config";

function generateApiKey(): string {
  return `pk_${config.nodeEnv === "production" ? "live" : "test"}_${crypto.randomBytes(24).toString("hex")}`;
}

export async function createMerchant(
  name: string,
  webhookUrl?: string
): Promise<{
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

export async function getMerchantBySlug(slug: string): Promise<{ id: string; name: string; apiKey: string } | null> {
  const m = await Merchant.findOne({ slug }).select("_id name apiKey").lean().exec();
  if (!m) return null;
  return { id: m._id.toString(), name: m.name, apiKey: m.apiKey };
}

/**
 * Ensures the interactive demo merchant exists (slug merch_demo, API key from env).
 * Safe to call on every API startup.
 */
export async function ensureDemoMerchant(): Promise<{ id: string; apiKey: string }> {
  const slug = (process.env.PAYKIT_DEMO_MERCHANT_SLUG ?? "merch_demo").trim();
  const envKey = process.env.PAYKIT_DEMO_MERCHANT_API_KEY?.trim();
  const existing = await Merchant.findOne({ slug }).exec();
  if (existing) {
    if (envKey && existing.apiKey !== envKey) {
      existing.apiKey = envKey;
      await existing.save();
    }
    return { id: existing._id.toString(), apiKey: existing.apiKey };
  }
  const apiKey =
    envKey ??
    `pk_demo_${crypto.randomBytes(18).toString("hex")}`;
  const created = await Merchant.create({
    name: "PayKit Demo",
    apiKey,
    slug,
    maxPaymentAmount: config.merchant.defaultMaxPaymentAmount,
  });
  return { id: created._id.toString(), apiKey: created.apiKey };
}

export async function ensureSettlementWalletId(merchantId: string): Promise<string> {
  const merchant = await Merchant.findById(merchantId).exec();
  if (!merchant) throw new Error("Merchant not found");
  if (merchant.settlementWalletId) {
    return merchant.settlementWalletId.toString();
  }
  const result = await createWallet(undefined);
  await Merchant.updateOne({ _id: merchantId }, { $set: { settlementWalletId: result.id } }).exec();
  try {
    await establishTrustline(result.id, "USDC");
  } catch (err) {
    console.error("[merchant] USDC trustline failed for settlement wallet", result.id, err);
  }
  if (config.stellar.pyusdIssuer) {
    try {
      await establishTrustline(result.id, "PYUSD");
    } catch (err) {
      console.warn("[merchant] PYUSD trustline failed for settlement wallet", result.id, err);
    }
  }
  return result.id;
}

function checkMaxPayment(merchant: { maxPaymentAmount?: string }, amount: string): void {
  const max = merchant.maxPaymentAmount ? parseFloat(merchant.maxPaymentAmount) : undefined;
  if (max !== undefined && parseFloat(amount) > max) {
    throw new Error(`Amount exceeds merchant maximum allowed (${max})`);
  }
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
  const walletResult = await createWallet(undefined);
  const expiresAt = new Date(Date.now() + CHECKOUT_EXPIRY_HOURS * 60 * 60 * 1000);
  const wallet = await Wallet.findById(walletResult.id).exec();
  if (!wallet) throw new Error("Wallet not created");
  const assetUpper = params.asset.toUpperCase();
  if (assetUpper !== "XLM") {
    try {
      await establishTrustline(walletResult.id, params.asset);
    } catch (err) {
      console.error("[checkout] trustline establishment failed", walletResult.id, params.asset, err);
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
    walletAddress: walletResult.publicKey,
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
