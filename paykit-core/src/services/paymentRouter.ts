import type { BlockchainAdapter } from "../chains/types";
import { getStellarAdapter } from "../chains/StellarAdapter";

const STELLAR_ASSETS = new Set(["XLM", "USDC", "PYUSD"]);

/**
 * Returns the best adapter for the given asset (and optional chain preference).
 * Today only Stellar is implemented; future: SolanaAdapter for USDC on Solana, etc.
 */
export function getAdapterForAsset(asset: string, _preferredChain?: string): BlockchainAdapter {
  const upper = asset.toUpperCase();
  if (STELLAR_ASSETS.has(upper)) {
    return getStellarAdapter();
  }
  throw new Error(`No adapter for asset ${asset}. Supported: XLM, USDC, PYUSD (Stellar).`);
}

/**
 * Execute payment via the appropriate chain adapter.
 */
export async function routePayment(params: {
  fromWalletId: string;
  toAddress: string;
  asset: string;
  amount: string;
  chain?: string;
}): Promise<{ txHash: string; chain: string }> {
  const adapter = getAdapterForAsset(params.asset, params.chain);
  const result = await adapter.sendPayment({
    fromWalletId: params.fromWalletId,
    toAddress: params.toAddress,
    asset: params.asset,
    amount: params.amount,
  });
  if (result.status !== "success") {
    throw new Error(`Payment failed on ${result.chain}`);
  }
  return { txHash: result.txHash, chain: result.chain };
}
