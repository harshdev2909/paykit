/**
 * Establish Stellar trustlines so a wallet can receive issued assets (USDC, PYUSD).
 * Required before an account can receive non-native assets.
 */

import {
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
} from "@stellar/stellar-sdk";
import { getStellarServer } from "../stellar/server";
import { getAssetByCode, isNativeAsset, USDC_ASSET_CODE } from "../stellar/assets";
import { getKeypairForWallet } from "../wallet/walletService";
import { Wallet } from "../database/models";
import { config } from "../config";

/**
 * Establish a trustline for the given asset on the wallet so it can receive that asset.
 * No-op for XLM (native). Throws if wallet not found or submission fails.
 */
export async function establishTrustline(walletId: string, assetCode: string): Promise<void> {
  const upper = assetCode.toUpperCase();
  if (isNativeAsset(upper)) {
    return;
  }
  const wallet = await Wallet.findById(walletId).exec();
  if (!wallet) throw new Error("Wallet not found");
  const keypair = await getKeypairForWallet(walletId);
  const server = getStellarServer();
  const sourceAccount = await server.loadAccount(wallet.publicKey);
  const asset = getAssetByCode(upper);

  const networkPassphrase =
    config.stellar.network === "testnet" ? Networks.TESTNET : Networks.PUBLIC;
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      Operation.changeTrust({
        asset,
        limit: "922337203685.4775807",
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  await server.submitTransaction(tx);
}

/**
 * Creates a trustline only if the account does not already trust this asset (same issuer).
 * Use before sending USDC/PYUSD from custodial wallets so Horizon never returns op_src_no_trust.
 */
export async function ensureTrustlineIfNeeded(walletId: string, assetCode: string): Promise<void> {
  const upper = assetCode.toUpperCase();
  if (isNativeAsset(upper)) {
    return;
  }

  const wallet = await Wallet.findById(walletId).exec();
  if (!wallet) throw new Error("Wallet not found");

  const issuer =
    upper === USDC_ASSET_CODE
      ? config.stellar.usdcIssuer
      : upper === "PYUSD"
        ? config.stellar.pyusdIssuer
        : "";
  if (!issuer) {
    throw new Error(`Issuer not configured for ${upper}`);
  }

  const server = getStellarServer();
  const account = await server.loadAccount(wallet.publicKey);

  const hasTrust = account.balances.some((b) => {
    if (b.asset_type === "native" || b.asset_type === "liquidity_pool_shares") {
      return false;
    }
    if ("asset_code" in b && "asset_issuer" in b) {
      return (
        String(b.asset_code).toUpperCase() === upper && String(b.asset_issuer) === issuer
      );
    }
    return false;
  });

  if (hasTrust) {
    return;
  }

  await establishTrustline(walletId, assetCode);
}
