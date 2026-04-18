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
import { getAssetByCode, isNativeAsset } from "../stellar/assets";
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
