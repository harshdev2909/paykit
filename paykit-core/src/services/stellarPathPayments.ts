import {
  TransactionBuilder,
  Operation,
  BASE_FEE,
  Networks,
  Asset,
} from "@stellar/stellar-sdk";
import { getStellarServer } from "../stellar/server";
import { getAssetByCode } from "../stellar/assets";
import { getKeypairForWallet } from "../wallet/walletService";
import { Wallet } from "../database/models";
import { Transaction as TxModel } from "../database/models";
import { config } from "../config";
import {
  findStrictSendPaths,
  selectBestPath,
  pathRecordToPathAssets,
  type PaymentPathRecord,
} from "./liquidityRouter";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/** Stellar requires destMin to be a string, positive, and at most 7 decimal places. Normalize to a valid value. */
function normalizeDestMin(input: string): string {
  const s = String(input).trim();
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return "0.0000001";
  const fixed = n.toFixed(7);
  if (parseFloat(fixed) <= 0) return "0.0000001";
  return fixed;
}

export interface PathPaymentRequest {
  fromWalletId: string;
  destination: string;
  sendAsset: string;
  sendAmount: string;
  destAsset: string;
  destMin: string;
}

export interface PathPaymentResult {
  txHash: string;
  status: "success";
  pathUsed?: PaymentPathRecord;
}

export async function executePathPayment(req: PathPaymentRequest): Promise<PathPaymentResult> {
  const wallet = await Wallet.findById(req.fromWalletId).exec();
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const keypair = await getKeypairForWallet(req.fromWalletId);
  const sendAsset = getAssetByCode(req.sendAsset);
  const destAsset = getAssetByCode(req.destAsset);
  const server = getStellarServer();

  const paths = await findStrictSendPaths(
    sendAsset,
    req.sendAmount,
    req.destination,
    destAsset
  );
  const bestPath = selectBestPath(paths);
  if (!bestPath) {
    throw new Error("No liquidity path found for the requested conversion");
  }

  const pathAssets = pathRecordToPathAssets(bestPath);
  const sourceAccount = await server.loadAccount(wallet.publicKey);
  const destMin = normalizeDestMin(req.destMin);

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
          Operation.pathPaymentStrictSend({
            sendAsset,
            sendAmount: req.sendAmount,
            destination: req.destination,
            destAsset,
            destMin,
            path: pathAssets,
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
        assetCode: req.sendAsset,
        assetIssuer: req.sendAsset === "USDC" ? config.stellar.usdcIssuer : req.sendAsset === "PYUSD" ? config.stellar.pyusdIssuer : undefined,
        amount: req.sendAmount,
        status: "success",
      });

      import("./webhookService").then(({ queueWebhookEvent }) => {
        queueWebhookEvent("path_payment.completed", {
          txHash,
          fromWallet: wallet.publicKey,
          destination: req.destination,
          sendAsset: req.sendAsset,
          sendAmount: req.sendAmount,
          destAsset: req.destAsset,
          destMin: req.destMin,
        }).catch(() => {});
      });
      return { txHash, status: "success", pathUsed: bestPath };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError ?? new Error("Path payment failed after retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
