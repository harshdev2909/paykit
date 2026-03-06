import { getStellarServer } from "../stellar/server";
import { Wallet, TreasuryAccount, CheckoutSession, Merchant } from "../database/models";
import { Transaction as TxModel } from "../database/models";
import { TreasuryTransaction } from "../database/models";
import { queueWebhookEvent } from "../services/webhookService";
import { creditMerchantBalance } from "../merchant/merchantService";
import { routePayment } from "../services/paymentRouter";
import { establishTrustline } from "../services/trustlineService";

/** Horizon 400 returns extras.result_codes.operations; Axios error has response.data */
function isHorizonOpNoTrust(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("no_trust") || msg.includes("op_no_trust")) return true;
  const ax = err as { response?: { data?: { extras?: { result_codes?: { operations?: string[] } } } } };
  const ops = ax?.response?.data?.extras?.result_codes?.operations;
  return Array.isArray(ops) && ops.some((c: string) => c === "op_no_trust");
}

function logHorizonError(err: unknown): void {
  const ax = err as { response?: { data?: { detail?: string; extras?: { result_codes?: unknown } } } };
  const detail = ax?.response?.data?.detail;
  const codes = ax?.response?.data?.extras?.result_codes;
  console.error("[watcher] Horizon tx failed:", detail ?? (err instanceof Error ? err.message : String(err)), "result_codes:", codes);
}

const NATIVE_ASSET = "native";
const PAYMENT_TYPES = new Set(["payment", "path_payment_strict_send", "path_payment_strict_receive"]);

interface HorizonPaymentRecord {
  id: string;
  type: string;
  transaction_hash: string;
  from?: string;
  to?: string;
  amount?: string;
  source_amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
  source_account?: string;
  source_asset_type?: string;
  source_asset_code?: string;
  source_asset_issuer?: string;
}

let walletPublicKeys: Set<string> = new Set();
let treasuryPublicKeys: Set<string> = new Set();
let checkoutWalletAddresses: Set<string> = new Set();

export async function refreshWalletPublicKeys(): Promise<void> {
  const [wallets, treasuries, checkouts] = await Promise.all([
    Wallet.find({}).select("publicKey").lean().exec(),
    TreasuryAccount.find({}).select("publicKey").lean().exec(),
    CheckoutSession.find({ status: "open" }).select("walletAddress").lean().exec(),
  ]);
  walletPublicKeys = new Set(wallets.map((w) => w.publicKey));
  treasuryPublicKeys = new Set(treasuries.map((t) => t.publicKey));
  checkoutWalletAddresses = new Set(checkouts.map((c) => c.walletAddress));
}

function getAssetCode(record: HorizonPaymentRecord): string {
  const type = record.asset_type ?? record.source_asset_type;
  const code = record.asset_code ?? record.source_asset_code;
  if (type === NATIVE_ASSET || !type) return "XLM";
  return code ?? "XLM";
}

function getAmount(record: HorizonPaymentRecord): string {
  return record.amount ?? record.source_amount ?? "0";
}

export async function handlePaymentRecord(record: HorizonPaymentRecord): Promise<void> {
  if (record.type && !PAYMENT_TYPES.has(record.type)) {
    return;
  }
  const from = record.from ?? record.source_account ?? "";
  const to = record.to ?? "";
  const txHash = record.transaction_hash;
  if (!txHash) return;
  const amount = getAmount(record);
  const assetCode = getAssetCode(record);
  const assetIssuer = record.asset_issuer ?? record.source_asset_issuer ?? undefined;

  const isOurWallet = (pk: string) => walletPublicKeys.has(pk);
  const isTreasury = (pk: string) => treasuryPublicKeys.has(pk);
  const isCheckoutWallet = (pk: string) => checkoutWalletAddresses.has(pk);
  const isCheckoutWalletOrOpen = async (pk: string) => {
    if (checkoutWalletAddresses.has(pk)) return true;
    const open = await CheckoutSession.findOne({ walletAddress: pk, status: "open" }).select("_id").lean().exec();
    if (open) {
      checkoutWalletAddresses.add(pk);
      return true;
    }
    return false;
  };
  const toIsCheckout = await isCheckoutWalletOrOpen(to);
  if (!isOurWallet(from) && !isOurWallet(to) && !isTreasury(from) && !isTreasury(to) && !toIsCheckout) {
    return;
  }

  await TxModel.findOneAndUpdate(
    { txHash },
    {
      $set: {
        txHash,
        fromWallet: from,
        toWallet: to,
        assetCode,
        assetIssuer,
        amount,
        status: "success",
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  ).exec();

  const treasuryAccount = await TreasuryAccount.findOne({ publicKey: from }).select("_id").lean().exec();
  if (treasuryAccount) {
    await TreasuryTransaction.findOneAndUpdate(
      { txHash },
      {
        $set: {
          treasuryAccountId: treasuryAccount._id,
          txHash,
          type: record.type === "path_payment_strict_send" || record.type === "path_payment_strict_receive" ? "path_payment" : "payment",
          assetCode,
          amount,
          counterparty: to,
          status: "success",
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    ).exec();
    queueWebhookEvent("treasury.updated", { txHash, treasuryAccountId: treasuryAccount._id.toString(), type: "payment", amount, assetCode }).catch(() => {});
  }

  if (toIsCheckout) {
    const session = await CheckoutSession.findOne({ walletAddress: to, status: "open" }).exec();
    if (session && session.asset === assetCode && parseFloat(amount) >= parseFloat(session.amount)) {
      const merchant = await Merchant.findById(session.merchantId).exec();
      if (!merchant) return;
      try {
        await new Promise((r) => setTimeout(r, 2000));
        const { ensureSettlementWalletId } = await import("../merchant/merchantService");
        const settlementWalletId = await ensureSettlementWalletId(merchant._id.toString());
        const settlementWallet = await Wallet.findById(settlementWalletId).select("publicKey").lean().exec();
        if (settlementWallet) {
          const doRoute = async () => {
            await routePayment({
              fromWalletId: session.walletId.toString(),
              toAddress: settlementWallet.publicKey,
              asset: assetCode,
              amount: session.amount,
            });
          };
          try {
            await doRoute();
          } catch (routeErr: unknown) {
            const isNoTrust = isHorizonOpNoTrust(routeErr);
            if (isNoTrust) {
              await establishTrustline(settlementWalletId, assetCode);
              await doRoute();
            } else {
              logHorizonError(routeErr);
              throw routeErr;
            }
          }
        }
        await creditMerchantBalance(session.merchantId.toString(), assetCode, session.amount, assetIssuer);
        await CheckoutSession.updateOne(
          { _id: session._id },
          { $set: { status: "completed", txHash, completedAt: new Date(), updatedAt: new Date() } }
        ).exec();
        const eventData = {
          checkoutSessionId: session._id.toString(),
          merchantId: session.merchantId.toString(),
          amount: session.amount,
          asset: assetCode,
          txHash,
        };
        queueWebhookEvent("checkout.completed", eventData, merchant.webhookUrl).catch(() => {});
      } catch (err) {
        console.error("Checkout completion failed", session._id, err);
        await CheckoutSession.updateOne(
          { _id: session._id },
          { $set: { status: "failed", updatedAt: new Date() } }
        ).exec();
        const merchantDoc = await Merchant.findById(session.merchantId).select("webhookUrl").lean().exec();
        queueWebhookEvent("checkout.failed", { checkoutSessionId: session._id.toString(), error: String(err) }, merchantDoc?.webhookUrl).catch(() => {});
      }
    }
  }
}

export function startPaymentStream(): void {
  const server = getStellarServer();
  const close = server
    .payments()
    .cursor("now")
    .stream({
      onmessage: (msg: HorizonPaymentRecord) => {
        handlePaymentRecord(msg).catch((err) => {
          console.error("Watcher: failed to process payment", msg?.id, err);
        });
      },
      onerror: (err: unknown) => {
        console.error("Watcher: stream error", err);
      },
    });

  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}
