import { Router, Request, Response } from "express";
import {
  createOrGetEmbeddedWallet,
  signTransactionForEmbeddedWallet,
  getEmbeddedWalletBalance,
} from "../../wallet/embeddedWalletService";

const router = Router();

router.post("/create", async (req: Request, res: Response) => {
  try {
    const { email, provider, providerId } = req.body as { email?: string; provider?: string; providerId?: string };
    const result = await createOrGetEmbeddedWallet({ email, provider, providerId });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Embedded wallet creation failed";
    res.status(400).json({ error: message });
  }
});

router.post("/sign", async (req: Request, res: Response) => {
  try {
    const { walletId, envelopeXdr } = req.body as { walletId: string; envelopeXdr: string };
    if (!walletId || !envelopeXdr) {
      res.status(400).json({ error: "Missing walletId or envelopeXdr" });
      return;
    }
    const result = await signTransactionForEmbeddedWallet(walletId, envelopeXdr);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transaction signing failed";
    res.status(400).json({ error: message });
  }
});

router.get("/balance", async (req: Request, res: Response) => {
  try {
    const walletId = req.query.walletId as string;
    if (!walletId) {
      res.status(400).json({ error: "Missing query: walletId" });
      return;
    }
    const result = await getEmbeddedWalletBalance(walletId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get balance";
    res.status(400).json({ error: message });
  }
});

export default router;
