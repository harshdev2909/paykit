import { Router, Request, Response } from "express";
import { Transaction, Wallet } from "../../database/models";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const walletId = req.query.walletId as string | undefined;
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);
    let query: Record<string, unknown> = {};
    if (walletId) {
      const wallet = await Wallet.findById(walletId).select("publicKey").lean().exec();
      if (!wallet) {
        res.status(404).json({ error: "Wallet not found" });
        return;
      }
      query = { $or: [{ fromWallet: wallet.publicKey }, { toWallet: wallet.publicKey }] };
    }
    const list = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    res.json({ transactions: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list transactions";
    res.status(500).json({ error: message });
  }
});

router.get("/:txHash", async (req: Request, res: Response) => {
  try {
    const { txHash } = req.params;
    const tx = await Transaction.findOne({ txHash }).lean().exec();
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    res.json(tx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get transaction";
    res.status(500).json({ error: message });
  }
});

export default router;
