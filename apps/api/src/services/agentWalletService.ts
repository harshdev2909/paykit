import mongoose from "mongoose";
import { Wallet } from "../database/models";
import {
  CreateWalletResult,
  createWallet,
  fundWalletWithFriendbot,
  getWalletWithBalances,
  getKeypairForWallet,
} from "../wallet/walletService";

export async function createAgentWallet(merchantId: string): Promise<CreateWalletResult> {
  return createWallet({ merchantId, kind: "agent" });
}

export async function listAgentWallets(merchantId: string): Promise<
  { id: string; publicKey: string; kind: string; agentPolicy?: Record<string, unknown>; createdAt: Date }[]
> {
  const oid = new mongoose.Types.ObjectId(merchantId);
  const rows = await Wallet.find({ merchantId: oid, kind: "agent" })
    .select("publicKey agentPolicy createdAt kind")
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  return rows.map((w) => ({
    id: String(w._id),
    publicKey: w.publicKey,
    kind: w.kind ?? "agent",
    agentPolicy: w.agentPolicy ?? undefined,
    createdAt: w.createdAt,
  }));
}

export async function getAgentWalletForMerchant(
  walletId: string,
  merchantId: string,
): Promise<{ id: string; publicKey: string; agentPolicy?: Record<string, unknown>; createdAt: Date } | null> {
  const oid = new mongoose.Types.ObjectId(merchantId);
  const w = await Wallet.findOne({ _id: walletId, merchantId: oid, kind: "agent" })
    .select("publicKey agentPolicy createdAt")
    .lean()
    .exec();
  if (!w) return null;
  return {
    id: String(w._id),
    publicKey: w.publicKey,
    agentPolicy: w.agentPolicy ?? undefined,
    createdAt: w.createdAt,
  };
}

export async function updateAgentWalletPolicy(
  walletId: string,
  merchantId: string,
  agentPolicy: Record<string, unknown>,
): Promise<{ id: string; agentPolicy: Record<string, unknown> } | null> {
  const oid = new mongoose.Types.ObjectId(merchantId);
  const updated = await Wallet.findOneAndUpdate(
    { _id: walletId, merchantId: oid, kind: "agent" },
    { $set: { agentPolicy } },
    { new: true },
  )
    .select("agentPolicy")
    .lean()
    .exec();
  if (!updated) return null;
  return { id: walletId, agentPolicy: (updated.agentPolicy as Record<string, unknown>) ?? {} };
}

export async function getAgentWalletWithBalances(walletId: string, merchantId: string) {
  const row = await getAgentWalletForMerchant(walletId, merchantId);
  if (!row) return null;
  const withBal = await getWalletWithBalances(walletId);
  if (!withBal) return null;
  return {
    ...row,
    balances: withBal.balances,
  };
}

export async function fundAgentWallet(walletId: string, merchantId: string): Promise<void> {
  const row = await getAgentWalletForMerchant(walletId, merchantId);
  if (!row) {
    throw new Error("Wallet not found for merchant");
  }
  await fundWalletWithFriendbot(row.publicKey);
}

export async function signHexMessage(walletId: string, merchantId: string, messageHex: string): Promise<Buffer> {
  await assertAgentWallet(walletId, merchantId);
  const kp = await getKeypairForWallet(walletId);
  const buf = Buffer.from(messageHex.replace(/^0x/, ""), "hex");
  return kp.sign(buf);
}

async function assertAgentWallet(walletId: string, merchantId: string): Promise<void> {
  const ok = await getAgentWalletForMerchant(walletId, merchantId);
  if (!ok) {
    throw new Error("Wallet not found for merchant");
  }
}
