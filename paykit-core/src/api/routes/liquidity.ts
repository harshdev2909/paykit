import { Router, Request, Response } from "express";
import { deposit, withdraw, getPositions, getPoolStats } from "../../services/liquidityService";
import { verifyOrgOrMerchantKey } from "../middleware/verifyOrgOrMerchantKey";
import { merchantRateLimit } from "../middleware/merchantRateLimit";
import type { MerchantRequest } from "../middleware/verifyOrgOrMerchantKey";

const router = Router();

router.get("/pool", async (_req: Request, res: Response) => {
  try {
    const stats = await getPoolStats();
    res.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get pool stats";
    res.status(500).json({ error: message });
  }
});

router.use(verifyOrgOrMerchantKey);
router.use(merchantRateLimit);

router.get("/positions", async (req: Request, res: Response) => {
  try {
    const reqWithAuth = req as MerchantRequest;
    const merchantId = reqWithAuth.merchantId;
    const organizationId = reqWithAuth.organizationId;
    const positions = await getPositions({
      ...(merchantId ? { merchantId } : {}),
      ...(organizationId ? { organizationId } : {}),
    });
    res.json({ positions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get positions";
    res.status(500).json({ error: message });
  }
});

router.post("/deposit", async (req: Request, res: Response) => {
  try {
    const { asset, amount } = req.body as { asset?: string; amount: string };
    const reqWithAuth = req as MerchantRequest;
    const merchantId = reqWithAuth.merchantId;
    const organizationId = reqWithAuth.organizationId;
    if (!amount) {
      res.status(400).json({ error: "Missing amount" });
      return;
    }
    const result = await deposit({
      asset: asset ?? "USDC",
      amount: String(amount),
      ...(merchantId ? { merchantId } : {}),
      ...(organizationId ? { organizationId } : {}),
    });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deposit failed";
    res.status(400).json({ error: message });
  }
});

router.post("/withdraw", async (req: Request, res: Response) => {
  try {
    const { positionId, amount } = req.body as { positionId: string; amount?: string };
    const reqWithAuth = req as MerchantRequest;
    const merchantId = reqWithAuth.merchantId;
    const organizationId = reqWithAuth.organizationId;
    if (!positionId) {
      res.status(400).json({ error: "Missing positionId" });
      return;
    }
    const result = await withdraw({
      positionId,
      amount: amount != null ? String(amount) : undefined,
      ...(merchantId ? { merchantId } : {}),
      ...(organizationId ? { organizationId } : {}),
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Withdraw failed";
    res.status(400).json({ error: message });
  }
});

export default router;
