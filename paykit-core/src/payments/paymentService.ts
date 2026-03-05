import {
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
} from "@stellar/stellar-sdk";
import { getStellarServer } from "../stellar/server";
import { getAssetByCode } from "../stellar/assets";
import { getKeypairForWallet } from "../wallet/walletService";
import { Wallet } from "../database/models";
import { Transaction as TxModel } from "../database/models";
import { config } from "../config";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface PaymentRequest {
  fromWalletId: string;
  toAddress: string;
  asset: "XLM" | "USDC" | "PYUSD";
  amount: string;
}

export interface PaymentResult {
  txHash: string;
  status: "success";
}

export async function executePayment(req: PaymentRequest): Promise<PaymentResult> {
  const wallet = await Wallet.findById(req.fromWalletId).exec();
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const keypair = await getKeypairForWallet(req.fromWalletId);
  const asset = getAssetByCode(req.asset);
  const server = getStellarServer();

  const sourceAccount = await server.loadAccount(wallet.publicKey);
  const amount = req.amount;

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
            destination: req.toAddress,
            asset,
            amount,
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
        toWallet: req.toAddress,
        assetCode: req.asset,
        assetIssuer: req.asset === "USDC" ? config.stellar.usdcIssuer : req.asset === "PYUSD" ? config.stellar.pyusdIssuer : undefined,
        amount: req.amount,
        status: "success",
      });

      import("../services/webhookService").then(({ queueWebhookEvent }) => {
        queueWebhookEvent("payment.completed", { txHash, fromWallet: wallet.publicKey, toWallet: req.toAddress, asset: req.asset, amount: req.amount }).catch(() => {});
      });
      return { txHash, status: "success" };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError ?? new Error("Payment failed after retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
