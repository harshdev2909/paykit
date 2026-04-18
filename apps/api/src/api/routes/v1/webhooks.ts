import mongoose from "mongoose";
import { Router, Response } from "express";
import { z } from "zod";
import { verifyApiKey } from "../../middleware/verifyApiKey";
import { WebhookSubscription, WEBHOOK_EVENTS } from "../../../database/models";
import { prisma } from "../../../lib/prisma";
import { deliverWebhook } from "../../../services/webhookService";

const router = Router();
router.use(verifyApiKey);

const registerBody = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
});

router.post("/", async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const allowed = WEBHOOK_EVENTS as readonly string[];
    const unknown = parsed.data.events.filter((e) => !allowed.includes(e));
    if (unknown.length > 0) {
      res.status(400).json({
        error: `Unsupported events: ${unknown.join(", ")}`,
        supported: [...allowed],
      });
      return;
    }
    const sub = await WebhookSubscription.create({
      merchantId: new mongoose.Types.ObjectId(merchantId),
      url: parsed.data.url.trim(),
      events: parsed.data.events as (typeof WEBHOOK_EVENTS)[number][],
      secret: parsed.data.secret,
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
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
});

/**
 * Replay the last settled receipt through this webhook subscription (live POST).
 * `id` is the Mongo subscription `_id`.
 */
router.post("/:id/replay", async (req, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const sid = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(sid)) {
      res.status(400).json({ error: "Invalid subscription id" });
      return;
    }
    const sub = await WebhookSubscription.findOne({
      _id: sid,
      merchantId: new mongoose.Types.ObjectId(merchantId),
      active: true,
    })
      .lean()
      .exec();
    if (!sub) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }
    const last = await prisma.receipt.findFirst({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
    });
    if (!last) {
      res.status(404).json({ error: "No receipts to replay" });
      return;
    }
    const payload = {
      id: `replay_${Date.now()}`,
      type: "receipt.settled" as const,
      created_at: new Date().toISOString(),
      data: {
        merchant_id: merchantId,
        receipt_id: last.id,
        replay: true,
        amount: last.amount,
        asset: last.asset,
      },
    };
    const result = await deliverWebhook(sub.url, payload, sub.secret ?? undefined);
    await prisma.webhookDelivery.create({
      data: {
        merchantId,
        subscriptionId: sid,
        url: sub.url,
        receiptId: last.id,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        lastError: result.ok ? null : `HTTP ${result.status ?? "error"}`,
      },
    });
    res.json({ ok: result.ok, status: result.status });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "failed" });
  }
});

export default router;
