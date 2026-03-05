import {
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
} from "@stellar/stellar-sdk";
import { getStellarServer } from "../stellar/server";
import { getAssetByCode } from "../stellar/assets";
import { getKeypairForWallet, fetchBalancesFromHorizon } from "../wallet/walletService";
import { Wallet } from "../database/models";
import { Transaction as TxModel } from "../database/models";
import { config } from "../config";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface PayoutRequest {
  walletId: string;
  destination: string;
  asset: "XLM" | "USDC" | "PYUSD";
  amount: string;
}

export interface PayoutResult {
  txHash: string;
  status: "success";
}

export async function executePayout(req: PayoutRequest): Promise<PayoutResult> {
  const wallet = await Wallet.findById(req.walletId).exec();
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const balances = await fetchBalancesFromHorizon(wallet.publicKey, req.walletId, false);
  const assetBalance = balances.find((b) => b.asset === req.asset);
  if (!assetBalance) {
    throw new Error(`Insufficient balance: no ${req.asset} balance found`);
  }

  const available = assetBalance.balance;
  if (parseFloat(req.amount) > parseFloat(available)) {
    throw new Error(
      `Insufficient balance: have ${available} ${req.asset}, requested ${req.amount}`
    );
  }

  const keypair = await getKeypairForWallet(req.walletId);
  const asset = getAssetByCode(req.asset);
  const server = getStellarServer();

  const sourceAccount = await server.loadAccount(wallet.publicKey);

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const networkPassphrase =
        config.stellar.network === "testnet" ? Networks.TESTNET : Networks.PUBLIC;
      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: req.destination,
            asset,
            amount: req.amount,
          })
        )
        .setTimeout(30)
        .build();

      tx.sign(keypair);
      const result = await server.submitTransaction(tx);
      const txHash = result.hash;

      await TxModel.create({
        txHash,
        fromWallet: wallet.publicKey,
        toWallet: req.destination,
        assetCode: req.asset,
        assetIssuer: req.asset === "USDC" ? config.stellar.usdcIssuer : req.asset === "PYUSD" ? config.stellar.pyusdIssuer : undefined,
        amount: req.amount,
        status: "success",
      });

      return { txHash, status: "success" };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError ?? new Error("Payout failed after retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
