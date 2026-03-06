/**
 * Liquidity provider — deposit into PayKit payment pools, track positions and APR.
 */

import { LiquidityPosition } from "../database/models";
import mongoose from "mongoose";

const DEFAULT_POOL_ID = "paykit_usdc";
const DEFAULT_APR = "5.25";

export async function deposit(params: {
  asset: string;
  amount: string;
  organizationId?: string;
  merchantId?: string;
}): Promise<{ positionId: string; asset: string; amount: string; poolId: string; apr: string }> {
  if (!params.organizationId && !params.merchantId) {
    throw new Error("Either organizationId or merchantId is required");
  }
  const amount = String(params.amount);
  if (!amount || parseFloat(amount) <= 0) throw new Error("Amount must be positive");
  const doc = await LiquidityPosition.create({
    asset: params.asset || "USDC",
    amount,
    poolId: DEFAULT_POOL_ID,
    apr: DEFAULT_APR,
    ...(params.organizationId ? { organizationId: new mongoose.Types.ObjectId(params.organizationId) } : {}),
    ...(params.merchantId ? { merchantId: new mongoose.Types.ObjectId(params.merchantId) } : {}),
  });
  return {
    positionId: doc._id.toString(),
    asset: doc.asset,
    amount: doc.amount,
    poolId: doc.poolId,
    apr: doc.apr ?? DEFAULT_APR,
  };
}

export async function withdraw(params: {
  positionId: string;
  amount?: string;
  organizationId?: string;
  merchantId?: string;
}): Promise<{ amount: string; positionId: string }> {
  const position = await LiquidityPosition.findById(params.positionId).exec();
  if (!position) throw new Error("Liquidity position not found");
  if (params.organizationId && position.organizationId?.toString() !== params.organizationId) {
    throw new Error("Position does not belong to this organization");
  }
  if (params.merchantId && position.merchantId?.toString() !== params.merchantId) {
    throw new Error("Position does not belong to this merchant");
  }
  const current = parseFloat(position.amount);
  const withdrawAmount = params.amount != null ? parseFloat(String(params.amount)) : current;
  if (withdrawAmount <= 0 || withdrawAmount > current) {
    throw new Error("Invalid withdraw amount");
  }
  const remaining = current - withdrawAmount;
  if (remaining <= 0) {
    await LiquidityPosition.findByIdAndDelete(params.positionId).exec();
  } else {
    position.amount = remaining.toFixed(7);
    await position.save();
  }
  return { amount: withdrawAmount.toFixed(7), positionId: params.positionId };
}

export async function getPositions(params: {
  organizationId?: string;
  merchantId?: string;
}): Promise<
  Array<{
    positionId: string;
    asset: string;
    amount: string;
    poolId: string;
    apr: string;
    createdAt: string;
  }>
> {
  const filter: Record<string, unknown> = {};
  if (params.organizationId) filter.organizationId = new mongoose.Types.ObjectId(params.organizationId);
  if (params.merchantId) filter.merchantId = new mongoose.Types.ObjectId(params.merchantId);
  const list = await LiquidityPosition.find(filter).sort({ createdAt: -1 }).lean().exec();
  return list.map((p) => ({
    positionId: (p._id as mongoose.Types.ObjectId).toString(),
    asset: p.asset,
    amount: p.amount,
    poolId: p.poolId,
    apr: p.apr ?? DEFAULT_APR,
    createdAt: (p as { createdAt: Date }).createdAt?.toISOString?.() ?? new Date().toISOString(),
  }));
}

export async function getPoolStats(): Promise<{ totalLiquidity: string; apr: string; poolId: string }> {
  const positions = await LiquidityPosition.find({ poolId: DEFAULT_POOL_ID }).lean().exec();
  const total = positions.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  return {
    totalLiquidity: total.toFixed(7),
    apr: DEFAULT_APR,
    poolId: DEFAULT_POOL_ID,
  };
}
