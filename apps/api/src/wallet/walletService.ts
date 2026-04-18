import mongoose from "mongoose";
import { Keypair } from "@stellar/stellar-sdk";
import { Wallet } from "../database/models";
import { encrypt, decrypt } from "../services/crypto";
import { config, requireEncryptionKey } from "../config";
import { getStellarServer } from "../stellar/server";
import { Balance } from "../database/models";
import { NATIVE_ASSET_CODE } from "../stellar/assets";

export interface CreateWalletResult {
  id: string;
  publicKey: string;
  createdAt: Date;
}

export interface CreateWalletOpts {
  userId?: string;
  merchantId?: string;
  kind?: "custodial" | "agent";
}

function normalizeCreateWalletOpts(opts?: string | CreateWalletOpts): {
  userId?: string;
  merchantId?: string;
  kind: "custodial" | "agent";
} {
  if (opts === undefined) {
    return { kind: "custodial" };
  }
  if (typeof opts === "string") {
    return { userId: opts, kind: "custodial" };
  }
  return {
    userId: opts.userId,
    merchantId: opts.merchantId,
    kind: opts.kind ?? "custodial",
  };
}

export interface WalletBalance {
  asset: string;
  balance: string;
  limit?: string;
}

export async function createWallet(opts?: string | CreateWalletOpts): Promise<CreateWalletResult> {
  requireEncryptionKey();
  const normalized = normalizeCreateWalletOpts(opts);
  const keypair = Keypair.random();
  const secret = keypair.secret();
  const encryptedPrivateKey = encrypt(secret, config.wallet.encryptionKey);

  const wallet = await Wallet.create({
    userId: normalized.userId ? new mongoose.Types.ObjectId(normalized.userId) : undefined,
    merchantId: normalized.merchantId ? new mongoose.Types.ObjectId(normalized.merchantId) : undefined,
    kind: normalized.kind,
    publicKey: keypair.publicKey(),
    encryptedPrivateKey,
  });

  await fundWalletWithFriendbot(keypair.publicKey());

  const result = {
    id: wallet._id.toString(),
    publicKey: wallet.publicKey,
    createdAt: wallet.createdAt,
  };
  import("../services/webhookService").then(({ queueWebhookEvent }) => {
    queueWebhookEvent("wallet.created", { walletId: result.id, publicKey: result.publicKey }).catch(() => {});
  });
  return result;
}

/** Testnet faucet top-up (no-op harmful on pubnets if misconfigured). */
export async function fundWalletWithFriendbot(publicKey: string): Promise<void> {
  const url = `${config.stellar.friendbotUrl}/?addr=${encodeURIComponent(publicKey)}`;
  const res = await fetch(url);
  if (res.ok) {
    return;
  }

  const text = await res.text();
  try {
    const body = JSON.parse(text) as { detail?: string };
    if (typeof body.detail === "string" && /already funded/i.test(body.detail)) {
      return;
    }
  } catch {
    // ignore parse errors; throw below
  }

  throw new Error(`Friendbot funding failed: ${res.status} ${text}`);
}

export async function getWalletById(id: string): Promise<{ _id: unknown; publicKey: string; encryptedPrivateKey: string; createdAt: Date; updatedAt: Date } | null> {
  return Wallet.findById(id).select("publicKey encryptedPrivateKey createdAt updatedAt").lean().exec() as Promise<{ _id: unknown; publicKey: string; encryptedPrivateKey: string; createdAt: Date; updatedAt: Date } | null>;
}

export async function getWalletByPublicKey(publicKey: string): Promise<{ _id: unknown; publicKey: string; encryptedPrivateKey: string; createdAt: Date; updatedAt: Date } | null> {
  return Wallet.findOne({ publicKey }).select("publicKey encryptedPrivateKey createdAt updatedAt").lean().exec() as Promise<{ _id: unknown; publicKey: string; encryptedPrivateKey: string; createdAt: Date; updatedAt: Date } | null>;
}

/**
 * Decrypt and return Keypair for server-side signing. Never expose secret to API.
 */
export async function getKeypairForWallet(walletId: string): Promise<Keypair> {
  requireEncryptionKey();
  const wallet = await Wallet.findById(walletId).exec();
  if (!wallet) {
    throw new Error("Wallet not found");
  }
  const secret = decrypt(wallet.encryptedPrivateKey, config.wallet.encryptionKey);
  return Keypair.fromSecret(secret);
}

/**
 * Get keypair for a wallet by public key (e.g. for SEP-10 anchor auth). Returns null if not a PayKit wallet.
 */
export async function getKeypairByPublicKey(publicKey: string): Promise<Keypair | null> {
  const wallet = await getWalletByPublicKey(publicKey);
  if (!wallet || !wallet._id) return null;
  try {
    return await getKeypairForWallet(String(wallet._id));
  } catch {
    return null;
  }
}

/**
 * Fetch balances from Horizon and optionally update Balance cache in DB.
 */
export async function fetchBalancesFromHorizon(
  publicKey: string,
  walletId: string,
  updateCache = true
): Promise<WalletBalance[]> {
  const server = getStellarServer();
  const account = await server.loadAccount(publicKey);
  const balances: WalletBalance[] = [];

  for (const b of account.balances) {
    const isNative = b.asset_type === "native";
    const assetCode = isNative ? NATIVE_ASSET_CODE : ("asset_code" in b ? b.asset_code : NATIVE_ASSET_CODE);
    const balance = b.balance;
    const limit = "limit" in b ? b.limit : undefined;
    const assetIssuer = !isNative && "asset_issuer" in b ? b.asset_issuer : undefined;
    balances.push({
      asset: assetCode,
      balance,
      limit,
    });

    if (updateCache) {
      await Balance.findOneAndUpdate(
        {
          publicKey,
          assetCode,
          assetIssuer,
        },
        {
          walletId,
          publicKey,
          assetCode,
          assetIssuer,
          amount: balance,
          lastUpdatedFromHorizon: new Date(),
        },
        { upsert: true, new: true }
      ).exec();
    }
  }

  return balances;
}

export async function getWalletWithBalances(walletId: string): Promise<{
  id: string;
  publicKey: string;
  balances: WalletBalance[];
  createdAt: Date;
} | null> {
  const wallet = await getWalletById(walletId);
  if (!wallet) return null;

  const balances = await fetchBalancesFromHorizon(wallet.publicKey, walletId);

  return {
    id: String(wallet._id),
    publicKey: wallet.publicKey,
    balances,
    createdAt: wallet.createdAt,
  };
}
