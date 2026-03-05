import mongoose from "mongoose";
import { Transaction } from "@stellar/stellar-sdk";
import { Networks } from "@stellar/stellar-sdk";
import { config } from "../config";
import { EmbeddedUser, Wallet } from "../database/models";
import { createWallet } from "./walletService";
import { getWalletWithBalances, getKeypairForWallet } from "./walletService";
import { queueWebhookEvent } from "../services/webhookService";

export interface CreateEmbeddedWalletParams {
  email?: string;
  provider?: string;
  providerId?: string;
}

export interface CreateEmbeddedWalletResult {
  walletId: string;
  publicKey: string;
  createdAt: Date;
}

export async function createOrGetEmbeddedWallet(params: CreateEmbeddedWalletParams): Promise<CreateEmbeddedWalletResult> {
  const { email, provider, providerId } = params;
  if (!email && !(provider && providerId)) {
    throw new Error("Provide email or provider + providerId");
  }

  let embedded = await EmbeddedUser.findOne(
    email ? { email: email.toLowerCase().trim() } : { provider, providerId }
  )
    .select("walletId")
    .lean()
    .exec();

  if (embedded) {
    const wallet = await Wallet.findById(embedded.walletId).select("publicKey createdAt").lean().exec();
    if (!wallet) throw new Error("Embedded wallet not found");
    return {
      walletId: (embedded.walletId as import("mongoose").Types.ObjectId).toString(),
      publicKey: wallet.publicKey,
      createdAt: wallet.createdAt,
    };
  }

  const createResult = await createWallet(undefined);
  await EmbeddedUser.create({
    email: email?.toLowerCase().trim(),
    provider,
    providerId,
    walletId: new mongoose.Types.ObjectId(createResult.id),
  });

  queueWebhookEvent("wallet.created", { walletId: createResult.id, publicKey: createResult.publicKey }).catch(() => {});

  return {
    walletId: createResult.id,
    publicKey: createResult.publicKey,
    createdAt: createResult.createdAt,
  };
}

export interface SignTransactionResult {
  signedEnvelopeXdr: string;
}

export async function signTransactionForEmbeddedWallet(
  walletId: string,
  envelopeXdrBase64: string
): Promise<SignTransactionResult> {
  const embedded = await EmbeddedUser.findOne({ walletId }).select("walletId").lean().exec();
  if (!embedded) throw new Error("Embedded wallet not found or not authorized");

  const keypair = await getKeypairForWallet(walletId);
  const networkPassphrase = config.stellar.network === "testnet" ? Networks.TESTNET : Networks.PUBLIC;
  const tx = new Transaction(envelopeXdrBase64, networkPassphrase);
  tx.sign(keypair);
  const signedXdr = tx.toEnvelope().toXDR("base64");
  return { signedEnvelopeXdr: signedXdr };
}

export async function getEmbeddedWalletBalance(walletId: string): Promise<{ balances: Array<{ asset: string; balance: string }> }> {
  const embedded = await EmbeddedUser.findOne({ walletId }).select("walletId").lean().exec();
  if (!embedded) throw new Error("Embedded wallet not found or not authorized");

  const wallet = await getWalletWithBalances(walletId);
  if (!wallet) throw new Error("Wallet not found");
  return {
    balances: wallet.balances.map((b) => ({ asset: b.asset, balance: b.balance })),
  };
}
