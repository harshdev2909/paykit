import { Router, Request, Response } from "express";
import { executePathPayment } from "../../services/stellarPathPayments";
import { getSwapQuote } from "../../services/swapQuoteService";
import { Wallet } from "../../database/models";
import { queueWebhookEvent } from "../../services/webhookService";

const router = Router();

router.get("/quote", async (req: Request, res: Response) => {
  try {
    const { walletId, fromAsset, toAsset, amount } = req.query as {
      walletId: string;
      fromAsset: string;
      toAsset: string;
      amount: string;
    };
    if (!walletId || !fromAsset || !toAsset || amount == null) {
      res.status(400).json({ error: "Missing walletId, fromAsset, toAsset, or amount" });
      return;
    }
    const wallet = await Wallet.findById(walletId).select("publicKey").lean().exec();
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    const from = fromAsset.toUpperCase();
    const to = toAsset.toUpperCase();
    if (from === to) {
      res.status(400).json({ error: "fromAsset and toAsset must differ" });
      return;
    }
    const quote = await getSwapQuote({
      destination: wallet.publicKey,
      sendAsset: from,
      sendAmount: String(amount),
      destAsset: to,
    });
    res.json(quote);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Swap quote failed";
    res.status(400).json({ error: message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { walletId, fromAsset, toAsset, amount } = req.body as {
      walletId: string;
      fromAsset: string;
      toAsset: string;
      amount: string;
    };
    if (!walletId || !fromAsset || !toAsset || amount == null) {
      res.status(400).json({ error: "Missing walletId, fromAsset, toAsset, or amount" });
      return;
    }
    const wallet = await Wallet.findById(walletId).select("publicKey").lean().exec();
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    const from = fromAsset.toUpperCase();
    const to = toAsset.toUpperCase();
    if (from === to) {
      res.status(400).json({ error: "fromAsset and toAsset must differ" });
      return;
    }
    // Stellar SDK requires destMin to be a positive number string (max 7 decimals). Use minimum.
    const destMin = "0.0000001";
    const result = await executePathPayment({
      fromWalletId: walletId,
      destination: wallet.publicKey,
      sendAsset: from,
      sendAmount: String(amount),
      destAsset: to,
      destMin,
    });
    await queueWebhookEvent("swap.executed", {
      txHash: result.txHash,
      walletId,
      fromAsset: from,
      toAsset: to,
      amount,
      destMin: result.pathUsed?.destination_amount,
    }).catch(() => {});
    res.json({
      txHash: result.txHash,
      fromAsset: from,
      toAsset: to,
      amount,
      status: "success",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Swap failed";
    res.status(400).json({ error: message });
  }
});

export default router;
