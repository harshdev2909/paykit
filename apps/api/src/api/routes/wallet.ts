import { Router, Request, Response } from "express";
import { createWallet, getWalletWithBalances } from "../../wallet/walletService";
import embeddedWalletRoutes from "./embeddedWallet";

const router = Router();

router.use("/embedded", embeddedWalletRoutes);

router.post("/create", async (req: Request, res: Response) => {
  try {
    const userId = req.body.userId as string | undefined;
    const result = await createWallet(userId);
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Wallet creation failed";
    res.status(500).json({ error: message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const wallet = await getWalletWithBalances(id);
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    res.json({
      id: wallet.id,
      publicKey: wallet.publicKey,
      balances: wallet.balances,
      createdAt: wallet.createdAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get wallet";
    res.status(500).json({ error: message });
  }
});

router.get("/:id/balance", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const wallet = await getWalletWithBalances(id);
    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }
    res.json({ balances: wallet.balances });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get balance";
    res.status(500).json({ error: message });
  }
});

export default router;
