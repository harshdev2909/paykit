import { Router, Request, Response } from "express";
import { WebhookSubscription, WEBHOOK_EVENTS } from "../../database/models";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { url, events, secret } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "Missing or invalid field: url" });
      return;
    }
    const eventList = Array.isArray(events) ? events : [events].filter(Boolean);
    const validEvents = eventList.filter((e: string) =>
      (WEBHOOK_EVENTS as readonly string[]).includes(e)
    );
    if (validEvents.length === 0) {
      res.status(400).json({
        error: "At least one event required. Supported: " + WEBHOOK_EVENTS.join(", "),
      });
      return;
    }
    const sub = await WebhookSubscription.create({
      url: url.trim(),
      events: validEvents,
      secret: secret ? String(secret) : undefined,
      active: true,
    });
    res.status(201).json({
      id: sub._id.toString(),
      url: sub.url,
      events: sub.events,
      active: sub.active,
      createdAt: sub.createdAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook registration failed";
    res.status(500).json({ error: message });
  }
});

export default router;
