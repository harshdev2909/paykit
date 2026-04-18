import { prisma } from "../lib/prisma";
import { queueWebhookEvent } from "./webhookService";
import { broadcastMerchantEvent } from "./phase3EventHub";

export interface CreateReceiptInput {
  merchantId: string;
  apiKeyId?: string;
  walletFrom: string;
  walletTo: string;
  asset: string;
  amount: string;
  domain?: string;
  path?: string;
  x402Nonce?: string;
  facilitatorTxHash?: string;
  stellarTxHash?: string;
  status: string;
  signedReceipt?: string;
}

export async function createReceipt(input: CreateReceiptInput) {
  const settledAt = input.status === "settled" ? new Date() : undefined;
  const row = await prisma.receipt.create({
    data: {
      merchantId: input.merchantId,
      apiKeyId: input.apiKeyId,
      walletFrom: input.walletFrom,
      walletTo: input.walletTo,
      asset: input.asset,
      amount: input.amount,
      domain: input.domain,
      path: input.path,
      x402Nonce: input.x402Nonce,
      facilitatorTxHash: input.facilitatorTxHash,
      stellarTxHash: input.stellarTxHash,
      status: input.status,
      signedReceipt: input.signedReceipt,
      settledAt,
    },
  });

  if (input.status === "settled") {
    await queueWebhookEvent(
      "receipt.settled",
      {
        merchant_id: input.merchantId,
        receipt_id: row.id,
        amount: input.amount,
        asset: input.asset,
        stellar_tx_hash: input.stellarTxHash,
      },
      undefined,
    );
    broadcastMerchantEvent(input.merchantId, {
      type: "receipt.settled",
      receiptId: row.id,
      amount: input.amount,
      asset: input.asset,
    });
  }

  return row;
}

export async function getReceiptForMerchant(id: string, merchantId: string) {
  return prisma.receipt.findFirst({
    where: { id, merchantId },
  });
}

export async function listReceiptsForMerchant(
  merchantId: string,
  opts: { limit: number; offset?: number },
) {
  const take = Math.min(opts.limit, 100);
  const rows = await prisma.receipt.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
    take,
    skip: opts.offset ?? 0,
  });
  return { receipts: rows };
}
