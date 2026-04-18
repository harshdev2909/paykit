import { Router, Response, Request, NextFunction } from "express";
import { verifyApiKey } from "../middleware/verifyApiKey";
import { phase3EventHub } from "../../services/phase3EventHub";
import { config } from "../../config";
import { getMerchantBySlug } from "../../merchant/merchantService";

const router = Router();

function attachStream(req: Request, res: Response, merchantId: string): void {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  (res as Response & { flushHeaders?: () => void }).flushHeaders?.();

  const channel = `m:${merchantId}`;
  const listener = (payload: unknown) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  phase3EventHub.on(channel, listener);

  const ping = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 25_000);

  req.on("close", () => {
    clearInterval(ping);
    phase3EventHub.off(channel, listener);
  });

  listener({ type: "connected", merchantId });
}

router.get("/stream", async (req: Request, res: Response, _next: NextFunction) => {
  const slugParam = typeof req.query.merchant === "string" ? req.query.merchant.trim() : "";
  if (slugParam === config.demo.merchantSlug) {
    const row = await getMerchantBySlug(config.demo.merchantSlug);
    if (!row) {
      res.status(503).json({ error: "demo_merchant_missing" });
      return;
    }
    attachStream(req, res, row.id);
    return;
  }

  await verifyApiKey(req, res, () => {
    const merchantId = (req as Request & { merchantId: string }).merchantId;
    attachStream(req, res, merchantId);
  });
});

export default router;
