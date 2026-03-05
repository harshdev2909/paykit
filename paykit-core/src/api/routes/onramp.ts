import { Router, Request, Response } from "express";
import { createOnrampBuy, createOfframpWithdraw } from "../../services/onrampService";
import { getWalletById } from "../../wallet/walletService";

const router = Router();

router.post("/buy", async (req: Request, res: Response) => {
  try {
    const { walletId, asset, fiatAmount, fiatCurrency, redirectUrl } = req.body as {
      walletId: string;
      asset?: string;
      fiatAmount?: number;
      fiatCurrency?: string;
      redirectUrl?: string;
    };
    if (!walletId) {
      res.status(400).json({ error: "Missing walletId" });
      return;
    }
    const wallet = await getWalletById(walletId);
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    const result = await createOnrampBuy({
      walletId,
      publicKey: wallet.publicKey,
      asset: asset ?? "USDC",
      fiatAmount: Number(fiatAmount) || 100,
      fiatCurrency: fiatCurrency ?? "USD",
      redirectUrl,
    });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onramp buy failed";
    res.status(500).json({ error: message });
  }
});

router.post("/withdraw", async (req: Request, res: Response) => {
  try {
    const { walletId, asset, amount, destinationType, destinationId } = req.body as {
      walletId: string;
      asset?: string;
      amount?: string;
      destinationType?: "bank" | "card";
      destinationId?: string;
    };
    if (!walletId || !amount) {
      res.status(400).json({ error: "Missing walletId or amount" });
      return;
    }
    const result = await createOfframpWithdraw({
      walletId,
      asset: asset ?? "USDC",
      amount: String(amount),
      destinationType: destinationType ?? "bank",
      destinationId,
    });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Offramp withdraw failed";
    res.status(500).json({ error: message });
  }
});

export default router;
