import type { BlockchainAdapter, WalletResult, BalanceResult, PaymentResult } from "./types";
import { createWallet } from "../wallet/walletService";
import { getStellarServer } from "../stellar/server";
import { executePayment } from "../payments/paymentService";
import { NATIVE_ASSET_CODE } from "../stellar/assets";

const CHAIN_ID = "stellar";

export class StellarAdapter implements BlockchainAdapter {
  readonly chainId = CHAIN_ID;

  async createWallet(): Promise<WalletResult> {
    const result = await createWallet(undefined);
    return {
      walletId: result.id,
      address: result.publicKey,
      chain: CHAIN_ID,
    };
  }

  async getBalance(address: string, asset: string): Promise<BalanceResult | null> {
    const server = getStellarServer();
    const code = this.getAssetCode(asset);
    try {
      const account = await server.loadAccount(address);
      for (const b of account.balances) {
        const isNative = b.asset_type === "native";
        const assetCode = isNative ? NATIVE_ASSET_CODE : "asset_code" in b ? b.asset_code : null;
        if (assetCode === code) {
          return {
            asset: code,
            amount: b.balance,
            chain: CHAIN_ID,
          };
        }
      }
      return { asset: code, amount: "0", chain: CHAIN_ID };
    } catch {
      return null;
    }
  }

  private getAssetCode(asset: string): string {
    return asset.toUpperCase() === NATIVE_ASSET_CODE ? NATIVE_ASSET_CODE : asset.toUpperCase();
  }

  async sendPayment(params: {
    fromWalletId: string;
    toAddress: string;
    asset: string;
    amount: string;
  }): Promise<PaymentResult> {
    const result = await executePayment({
      fromWalletId: params.fromWalletId,
      toAddress: params.toAddress,
      asset: params.asset as "XLM" | "USDC" | "PYUSD",
      amount: params.amount,
    });
    return {
      txHash: result.txHash,
      chain: CHAIN_ID,
      status: "success",
    };
  }
}

let defaultInstance: StellarAdapter | null = null;

export function getStellarAdapter(): StellarAdapter {
  if (!defaultInstance) {
    defaultInstance = new StellarAdapter();
  }
  return defaultInstance;
}
