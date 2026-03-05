import { Router, Request, Response } from "express";
import { getYieldProvider } from "../../services/yieldManager";
import { getWalletById } from "../../wallet/walletService";
import { isTreasuryAsset } from "../../stellar/assets";

const router = Router();

router.post("/deposit", async (req: Request, res: Response) => {
  try {
    const { walletId, treasuryAccountId, asset, amount } = req.body as {
      walletId?: string;
      treasuryAccountId: string;
      asset: string;
      amount: string;
    };
    if (!treasuryAccountId || !asset || amount == null) {
      res.status(400).json({ error: "Missing treasuryAccountId, asset, or amount" });
      return;
    }
    if (!isTreasuryAsset(asset)) {
      res.status(400).json({ error: "Unsupported asset for yield. Use XLM, USDC, or PYUSD." });
      return;
    }
    const provider = getYieldProvider();
    const result = await provider.deposit(asset, String(amount));
    res.status(201).json({ positionId: result.positionId, asset, amount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yield deposit failed";
    res.status(500).json({ error: message });
  }
});

router.post("/withdraw", async (req: Request, res: Response) => {
  try {
    const { treasuryAccountId, asset, amount } = req.body as {
      treasuryAccountId: string;
      asset: string;
      amount: string;
    };
    if (!treasuryAccountId || !asset || amount == null) {
      res.status(400).json({ error: "Missing treasuryAccountId, asset, or amount" });
      return;
    }
    const provider = getYieldProvider();
    const result = await provider.withdraw(asset, String(amount));
    res.json({ amount: result.amount, asset });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yield withdraw failed";
    res.status(500).json({ error: message });
  }
});

router.get("/positions", async (req: Request, res: Response) => {
  try {
    const asset = req.query.asset as string;
    const provider = getYieldProvider();
    const assets = asset ? [asset] : ["XLM", "USDC", "PYUSD"].filter((a) => a !== "PYUSD" || process.env.STELLAR_PYUSD_ISSUER);
    const positions = await Promise.all(
      assets.map(async (a) => {
        try {
          return await provider.getPosition(a);
        } catch {
          return null;
        }
      })
    );
    const result = assets
      .map((a, i) => (positions[i] ? { asset: a, ...positions[i] } : null))
      .filter(Boolean);
    res.json({ positions: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get yield positions";
    res.status(500).json({ error: message });
  }
});

export default router;
