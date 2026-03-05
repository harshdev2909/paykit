import { Router, Request, Response } from "express";
import { getRedis } from "../../services/redis";
import { getEventsChannel, getRecentEvents } from "../../services/eventStreamService";

const router = Router();

router.get("/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const subscriber = getRedis().duplicate();
  const channel = getEventsChannel();
  subscriber.subscribe(channel, (err) => {
    if (err) {
      res.write(`data: ${JSON.stringify({ error: "Subscribe failed" })}\n\n`);
      res.end();
      return;
    }
  });
  subscriber.on("message", (_ch: string, message: string) => {
    try {
      res.write(`data: ${message}\n\n`);
    } catch {
      subscriber.unsubscribe(channel);
      subscriber.quit();
    }
  });
  req.on("close", () => {
    subscriber.unsubscribe(channel);
    subscriber.quit();
  });
});

router.get("/recent", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);
    const events = await getRecentEvents(limit);
    res.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get events";
    res.status(500).json({ error: message });
  }
});

export default router;
