/**
 * Stablecoin credit lines — borrow against treasury balance.
 * Limit = treasury balance * 0.3 (configurable).
 */

import { CreditLine, TreasuryAccount } from "../database/models";
import { getTreasuryBalance } from "../treasury/treasuryService";
import mongoose from "mongoose";

const CREDIT_LIMIT_RATIO = 0.3;

export async function getLimit(treasuryAccountId: string): Promise<{
  treasuryAccountId: string;
  limitAmount: string;
  borrowedAmount: string;
  availableAmount: string;
  currency: string;
}> {
  const account = await TreasuryAccount.findById(treasuryAccountId).exec();
  if (!account) throw new Error("Treasury account not found");
  const balances = await getTreasuryBalance(treasuryAccountId);
  const usdcBalance = balances.find((b) => b.assetCode === "USDC");
  const totalValue = usdcBalance ? parseFloat(usdcBalance.amount) : 0;
  const limitAmount = totalValue * CREDIT_LIMIT_RATIO;
  let credit = await CreditLine.findOne({ treasuryAccountId: account._id }).exec();
  if (!credit) {
    credit = await CreditLine.create({
      treasuryAccountId: account._id,
      limitAmount: limitAmount.toFixed(7),
      borrowedAmount: "0",
      repaidAmount: "0",
      currency: "USDC",
    });
  } else {
    credit.limitAmount = limitAmount.toFixed(7);
    await credit.save();
  }
  const borrowed = parseFloat(credit.borrowedAmount);
  const repaid = parseFloat(credit.repaidAmount);
  const outstanding = Math.max(0, borrowed - repaid);
  const limit = parseFloat(credit.limitAmount);
  const available = Math.max(0, limit - outstanding);
  return {
    treasuryAccountId,
    limitAmount: limit.toFixed(7),
    borrowedAmount: outstanding.toFixed(7),
    availableAmount: available.toFixed(7),
    currency: credit.currency ?? "USDC",
  };
}

export async function borrow(params: {
  treasuryAccountId: string;
  amount: string;
}): Promise<{ amount: string; outstanding: string }> {
  const limitData = await getLimit(params.treasuryAccountId);
  const amount = parseFloat(params.amount);
  if (amount <= 0) throw new Error("Amount must be positive");
  const available = parseFloat(limitData.availableAmount);
  if (amount > available) throw new Error("Amount exceeds available credit");
  const account = await TreasuryAccount.findById(params.treasuryAccountId).exec();
  if (!account) throw new Error("Treasury account not found");
  let credit = await CreditLine.findOne({ treasuryAccountId: account._id }).exec();
  if (!credit) {
    credit = await CreditLine.create({
      treasuryAccountId: account._id,
      limitAmount: limitData.limitAmount,
      borrowedAmount: "0",
      repaidAmount: "0",
      currency: "USDC",
    });
  }
  const borrowed = parseFloat(credit.borrowedAmount);
  credit.borrowedAmount = (borrowed + amount).toFixed(7);
  await credit.save();
  const repaid = parseFloat(credit.repaidAmount);
  const outstanding = Math.max(0, parseFloat(credit.borrowedAmount) - repaid);
  return { amount: params.amount, outstanding: outstanding.toFixed(7) };
}

export async function repay(params: {
  treasuryAccountId: string;
  amount: string;
}): Promise<{ amount: string; outstanding: string }> {
  const amount = parseFloat(params.amount);
  if (amount <= 0) throw new Error("Amount must be positive");
  const account = await TreasuryAccount.findById(params.treasuryAccountId).exec();
  if (!account) throw new Error("Treasury account not found");
  const credit = await CreditLine.findOne({ treasuryAccountId: account._id }).exec();
  if (!credit) throw new Error("No credit line found for this treasury");
  const borrowed = parseFloat(credit.borrowedAmount);
  const repaid = parseFloat(credit.repaidAmount);
  const outstanding = Math.max(0, borrowed - repaid);
  const repayAmount = Math.min(amount, outstanding);
  credit.repaidAmount = (repaid + repayAmount).toFixed(7);
  await credit.save();
  const newOutstanding = Math.max(0, borrowed - parseFloat(credit.repaidAmount));
  return { amount: repayAmount.toFixed(7), outstanding: newOutstanding.toFixed(7) };
}
