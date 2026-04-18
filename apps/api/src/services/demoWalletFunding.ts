/**
 * Demo agent wallets must hold USDC (from settlement) and enough XLM for fees/reserves.
 * Settlement transfer can fail silently at wallet creation; Horizon then returns op_underfunded.
 */

import type { HorizonApi } from "@stellar/stellar-sdk/lib/horizon/horizon_api";
import { getStellarServer } from "../stellar/server";
import { config } from "../config";
import { USDC_ASSET_CODE } from "../stellar/assets";
import { fundWalletWithFriendbot } from "../wallet/walletService";
import { getAgentWalletForMerchant } from "./agentWalletService";
import { submitWalletPayment } from "./stellarPayment";
import { ensureSettlementWalletId } from "../merchant/merchantService";

/** Enough XLM on testnet for fees + reserves (Friendbot typically sends much more). */
const MIN_NATIVE_XLM = 5;

function parseNativeAndUsdc(balances: HorizonApi.BalanceLine[]): { native: number; usdc: number } {
  let native = 0;
  let usdc = 0;
  for (const b of balances) {
    if (b.asset_type === "native") {
      native = parseFloat(b.balance);
      continue;
    }
    if (b.asset_type === "liquidity_pool_shares") continue;
    if ("asset_code" in b && "asset_issuer" in b) {
      if (
        String(b.asset_code).toUpperCase() === USDC_ASSET_CODE &&
        String(b.asset_issuer) === config.stellar.usdcIssuer
      ) {
        usdc = parseFloat(b.balance);
      }
    }
  }
  return { native, usdc };
}

/** Call before `changeTrust` so the account can pay the trustline tx fee. */
export async function ensureDemoNativeTopUp(walletId: string, merchantId: string): Promise<void> {
  const agent = await getAgentWalletForMerchant(walletId, merchantId);
  if (!agent) throw new Error("Wallet not found for merchant");

  const server = getStellarServer();
  const account = await server.loadAccount(agent.publicKey);
  const { native } = parseNativeAndUsdc(account.balances);
  if (native >= MIN_NATIVE_XLM) {
    return;
  }
  try {
    await fundWalletWithFriendbot(agent.publicKey);
  } catch (e) {
    console.warn("[demo] Friendbot top-up failed", e);
  }
}

/**
 * Call after USDC trustline exists. Sends USDC from settlement if the agent cannot cover `amountUsdc`.
 */
export async function ensureDemoUsdcTopUpFromSettlement(
  walletId: string,
  merchantId: string,
  amountUsdc: number,
): Promise<void> {
  const agent = await getAgentWalletForMerchant(walletId, merchantId);
  if (!agent) throw new Error("Wallet not found for merchant");

  const server = getStellarServer();
  const account = await server.loadAccount(agent.publicKey);
  const { usdc } = parseNativeAndUsdc(account.balances);

  if (usdc + 1e-10 >= amountUsdc) {
    return;
  }

  const neededRaw = amountUsdc - usdc + 1e-7;
  const needed = Math.min(50, Math.max(neededRaw, 0));
  if (needed <= 1e-9) {
    return;
  }

  const settleId = await ensureSettlementWalletId(merchantId);
  await submitWalletPayment({
    fromWalletId: settleId,
    toAddress: agent.publicKey,
    asset: "USDC",
    amount: needed.toFixed(7),
  });
}
