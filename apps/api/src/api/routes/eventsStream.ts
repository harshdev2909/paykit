import { Router, Response } from "express";
import { verifyApiKey } from "../middleware/verifyApiKey";
import { phase3EventHub } from "../../services/phase3EventHub";

const router = Router();

router.get("/stream", verifyApiKey, (req, res: Response) => {
  const merchantId = req.merchantId!;
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
});

export default router;
