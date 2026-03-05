import { Router, Request, Response } from "express";
import { executePayout } from "../../payments/payoutService";
import { idempotencyMiddleware } from "../middleware/idempotency";
import { paymentLimiter } from "../middleware/rateLimit";

const router = Router();

router.post(
  "/",
  paymentLimiter,
  idempotencyMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { walletId, destination, asset, amount } = req.body;
      if (!walletId || !destination || !asset || amount == null) {
        res.status(400).json({
          error: "Missing required fields: walletId, destination, asset, amount",
        });
        return;
      }
      if (!["XLM", "USDC"].includes(String(asset).toUpperCase())) {
        res.status(400).json({ error: "Asset must be XLM or USDC" });
        return;
      }
      const result = await executePayout({
        walletId: String(walletId),
        destination: String(destination),
        asset: String(asset).toUpperCase() as "XLM" | "USDC",
        amount: String(amount),
      });
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payout failed";
      const status = message.includes("not found")
        ? 404
        : message.includes("Insufficient")
          ? 400
          : 500;
      res.status(status).json({ error: message });
    }
  }
);

export default router;
