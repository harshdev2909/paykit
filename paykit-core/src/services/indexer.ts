/**
 * Blockchain indexer — tracks PayKit-related transactions via Horizon streaming.
 * Stores transactions, token transfers, and wallet balances for querying.
 */

import { getStellarServer } from "../stellar/server";
import { Wallet, Transaction as TxModel } from "../database/models";
import { getRedis } from "./redis";

const INDEXER_CURSOR_KEY = "paykit:indexer:payment_cursor";
const INDEXER_ENABLED = process.env.INDEXER_ENABLED !== "false";

export interface IndexedPayment {
  id: string;
  txHash: string;
  from: string;
  to: string;
  assetCode: string;
  amount: string;
  createdAt: string;
}

export async function getIndexerCursor(): Promise<string> {
  const redis = getRedis();
  const cursor = await redis.get(INDEXER_CURSOR_KEY);
  return cursor ?? "now";
}

export async function setIndexerCursor(cursor: string): Promise<void> {
  const redis = getRedis();
  await redis.set(INDEXER_CURSOR_KEY, cursor);
}

export async function startPaymentIndexer(): Promise<() => void> {
  if (!INDEXER_ENABLED) {
    return () => {};
  }
  const server = getStellarServer();
  const close = server
    .payments()
    .cursor(await getIndexerCursor())
    .stream({
      onmessage: async (msg: { transaction_hash?: string; id?: string; from?: string; to?: string; amount?: string; asset_type?: string; asset_code?: string }) => {
        try {
          const txHash = msg.transaction_hash ?? msg.id?.toString().split("-")[0];
          const from = msg.from ?? "";
          const to = msg.to ?? "";
          const amount = msg.amount ?? "0";
          const assetType = msg.asset_type;
          const assetCode = assetType === "native" ? "XLM" : (msg.asset_code ?? "XLM");
          if (txHash) {
            await TxModel.findOneAndUpdate(
              { txHash },
              {
                $set: {
                  txHash,
                  fromWallet: from,
                  toWallet: to,
                  assetCode,
                  amount,
                  status: "success",
                  updatedAt: new Date(),
                },
              },
              { upsert: true }
            ).exec();
          }
        } catch (err) {
          console.error("[indexer] payment message error", err);
        }
      },
      onerror: (err: unknown) => {
        console.error("[indexer] stream error", err);
      },
    });
  return close;
}
