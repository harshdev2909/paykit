import { Router, Request, Response } from "express";
import { executePayment } from "../../payments/paymentService";
import { executePathPayment } from "../../services/stellarPathPayments";
import { idempotencyMiddleware } from "../middleware/idempotency";
import { paymentLimiter } from "../middleware/rateLimit";

const router = Router();

router.post(
  "/",
  paymentLimiter,
  idempotencyMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { fromWalletId, toAddress, asset, amount } = req.body;
      if (!fromWalletId || !toAddress || !asset || amount == null) {
        res.status(400).json({
          error: "Missing required fields: fromWalletId, toAddress, asset, amount",
        });
        return;
      }
      if (!["XLM", "USDC", "PYUSD"].includes(String(asset).toUpperCase())) {
        res.status(400).json({ error: "Asset must be XLM, USDC, or PYUSD" });
        return;
      }
      const result = await executePayment({
        fromWalletId: String(fromWalletId),
        toAddress: String(toAddress),
        asset: String(asset).toUpperCase() as "XLM" | "USDC" | "PYUSD",
        amount: String(amount),
      });
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      const status = message.includes("not found") ? 404 : 500;
      res.status(status).json({ error: message });
    }
  }
);

router.post(
  "/path",
  paymentLimiter,
  idempotencyMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { fromWalletId, destination, sendAsset, sendAmount, destAsset, destMin } = req.body;
      if (!fromWalletId || !destination || !sendAsset || sendAmount == null || !destAsset || destMin == null) {
        res.status(400).json({
          error: "Missing required fields: fromWalletId, destination, sendAsset, sendAmount, destAsset, destMin",
        });
        return;
      }
      const result = await executePathPayment({
        fromWalletId: String(fromWalletId),
        destination: String(destination),
        sendAsset: String(sendAsset),
        sendAmount: String(sendAmount),
        destAsset: String(destAsset),
        destMin: String(destMin),
      });
      res.status(200).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Path payment failed";
      const status = message.includes("not found") ? 404 : message.includes("No liquidity") ? 422 : 500;
      res.status(status).json({ error: message });
    }
  }
);

export default router;
