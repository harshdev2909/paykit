import { Router, Request, Response } from "express";
import { WebhookSubscription } from "../../database/models";
import { WEBHOOK_EVENTS } from "../../database/models/WebhookSubscription";
import type { WebhookEventType } from "../../database/models/WebhookSubscription";

const router = Router();

const BLOCKCHAIN_EVENTS: WebhookEventType[] = [
  "payment.completed",
  "payment.created",
  "payment.failed",
  "wallet.created",
  "swap.executed",
  "checkout.completed",
  "checkout.failed",
];

router.post("/", async (req: Request, res: Response) => {
  try {
    const { event, url, secret, events } = req.body as {
      event?: WebhookEventType;
      url: string;
      secret?: string;
      events?: WebhookEventType[];
    };
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "Missing or invalid url" });
      return;
    }
    const eventList = event ? [event] : Array.isArray(events) ? events : BLOCKCHAIN_EVENTS;
    const valid = eventList.filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e)) as WebhookEventType[];
    if (valid.length === 0) {
      res.status(400).json({ error: "At least one valid event required" });
      return;
    }
    const sub = await WebhookSubscription.create({
      url: url.trim(),
      secret: secret?.trim(),
      events: valid,
      active: true,
    });
    res.status(201).json({
      id: sub._id.toString(),
      url: sub.url,
      events: sub.events,
      active: sub.active,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create webhook subscription";
    res.status(500).json({ error: message });
  }
});

export default router;
