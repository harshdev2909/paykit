import mongoose from "mongoose";
import { Wallet } from "../database/models";
import { TreasuryAccount, TreasuryBalance, TreasuryTransaction } from "../database/models";
import { createWallet } from "../wallet/walletService";
import { getStellarServer } from "../stellar/server";
import { fetchBalancesFromHorizon } from "../wallet/walletService";
import { getAssetByCode, isTreasuryAsset } from "../stellar/assets";
import { getYieldProvider } from "../services/yieldManager";

export interface CreateTreasuryResult {
  id: string;
  name: string;
  walletId: string;
  publicKey: string;
  createdAt: Date;
}

export async function createTreasury(name: string, userId?: string): Promise<CreateTreasuryResult> {
  const walletResult = await createWallet(undefined);
  const wallet = await Wallet.findById(walletResult.id).exec();
  if (!wallet) throw new Error("Wallet not created");
  const treasury = await TreasuryAccount.create({
    name,
    walletId: wallet._id,
    publicKey: wallet.publicKey,
    isMultisig: false,
    ...(userId ? { userId: new mongoose.Types.ObjectId(userId) } : {}),
  });
  return {
    id: treasury._id.toString(),
    name: treasury.name,
    walletId: walletResult.id,
    publicKey: treasury.publicKey,
    createdAt: treasury.createdAt,
  };
}

export async function listTreasuriesByUserId(userId: string): Promise<{ id: string; name: string; publicKey: string; createdAt: Date }[]> {
  const list = await TreasuryAccount.find({ userId: new mongoose.Types.ObjectId(userId) })
    .select("_id name publicKey createdAt")
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  return list.map((t) => ({
    id: (t._id as mongoose.Types.ObjectId).toString(),
    name: t.name,
    publicKey: t.publicKey,
    createdAt: t.createdAt,
  }));
}

export async function getTreasuryBalance(treasuryAccountId: string): Promise<
  { assetCode: string; amount: string; yieldEnabled?: boolean; principalAmount?: string; yieldEarned?: string; apy?: string }[]
> {
  const account = await TreasuryAccount.findById(treasuryAccountId).exec();
  if (!account) throw new Error("Treasury account not found");
  const server = getStellarServer();
  const horizonAccount = await server.loadAccount(account.publicKey);
  const balances: { assetCode: string; amount: string; yieldEnabled?: boolean; principalAmount?: string; yieldEarned?: string; apy?: string }[] = [];
  for (const b of horizonAccount.balances) {
    const isNative = b.asset_type === "native";
    const assetCode = isNative ? "XLM" : "asset_code" in b ? b.asset_code : "XLM";
    const assetIssuer = !isNative && "asset_issuer" in b ? (b as { asset_issuer: string }).asset_issuer : undefined;
    const amount = b.balance;
    const tb = await TreasuryBalance.findOne({
      treasuryAccountId: account._id,
      assetCode,
      assetIssuer: assetIssuer ?? undefined,
    }).lean().exec();
    balances.push({
      assetCode,
      amount,
      yieldEnabled: tb?.yieldEnabled ?? false,
      principalAmount: tb?.principalAmount,
      yieldEarned: tb?.yieldEarned,
      apy: tb?.apy,
    });
    await TreasuryBalance.findOneAndUpdate(
      { treasuryAccountId: account._id, assetCode, assetIssuer: assetIssuer ?? undefined },
      {
        treasuryAccountId: account._id,
        assetCode,
        assetIssuer: assetIssuer ?? undefined,
        amount,
        lastUpdatedFromHorizon: new Date(),
      },
      { upsert: true }
    ).exec();
  }
  return balances;
}

export interface AllocateRequest {
  treasuryAccountId: string;
  assetCode: string;
  amount: string;
  destinationWalletId: string;
}

export async function allocateTreasury(req: AllocateRequest): Promise<{ txHash: string }> {
  const { executePayment } = await import("../payments/paymentService");
  const treasury = await TreasuryAccount.findById(req.treasuryAccountId).exec();
  if (!treasury) throw new Error("Treasury account not found");
  const destWallet = await Wallet.findById(req.destinationWalletId).select("publicKey").lean().exec();
  if (!destWallet) throw new Error("Destination wallet not found");
  const result = await executePayment({
    fromWalletId: treasury.walletId.toString(),
    toAddress: destWallet.publicKey,
    asset: req.assetCode as "XLM" | "USDC" | "PYUSD",
    amount: req.amount,
  });
  await TreasuryTransaction.create({
    treasuryAccountId: req.treasuryAccountId,
    txHash: result.txHash,
    type: "allocation",
    assetCode: req.assetCode,
    amount: req.amount,
    counterparty: destWallet.publicKey,
    status: "success",
  });
  return { txHash: result.txHash };
}

export async function enableTreasuryYield(treasuryAccountId: string, assetCode: string): Promise<{ enabled: boolean }> {
  if (!isTreasuryAsset(assetCode)) throw new Error("Unsupported asset for yield");
  const account = await TreasuryAccount.findById(treasuryAccountId).exec();
  if (!account) throw new Error("Treasury account not found");
  const provider = getYieldProvider();
  const rate = await provider.getYieldRate(assetCode);
  await TreasuryBalance.findOneAndUpdate(
    { treasuryAccountId: account._id, assetCode },
    {
      yieldEnabled: true,
      principalAmount: "0",
      yieldEarned: "0",
      apy: rate.apy,
    },
    { upsert: true }
  ).exec();
  return { enabled: true };
}
