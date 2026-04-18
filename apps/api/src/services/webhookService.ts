import mongoose from "mongoose";
import { getRedisOptional } from "./redis";
import { WebhookSubscription } from "../database/models";
import { config } from "../config";
import crypto from "crypto";

const WEBHOOK_QUEUE_KEY = "paykit:webhook_queue";
const WEBHOOK_QUEUE_PROCESSING = "paykit:webhook_processing";

export type WebhookEventName =
  | "payment.created"
  | "payment.completed"
  | "payment.failed"
  | "wallet.created"
  | "checkout.completed"
  | "checkout.failed"
  | "receipt.settled"
  | "x402.verified";

export interface WebhookPayload {
  id: string;
  type: WebhookEventName;
  created_at: string;
  data: Record<string, unknown>;
}

function generateEventId(): string {
  return `evt_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
}

export interface WebhookQueueItem extends WebhookPayload {
  merchantWebhookUrl?: string;
}

export async function queueWebhookEvent(
  type: WebhookEventName,
  data: Record<string, unknown>,
  merchantWebhookUrl?: string
): Promise<void> {
  const client = getRedisOptional();
  if (!client) return;
  try {
    const payload: WebhookQueueItem = {
      id: generateEventId(),
      type,
      created_at: new Date().toISOString(),
      data,
      merchantWebhookUrl,
    };
    await client.rpush(WEBHOOK_QUEUE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore when Redis unavailable */
  }
}

export async function getSubscriptionsForEvent(
  event: WebhookEventName,
  merchantId?: string,
): Promise<{ url: string; secret?: string }[]> {
  const filter: Record<string, unknown> = { active: true, events: event };
  if (merchantId && mongoose.Types.ObjectId.isValid(merchantId)) {
    const oid = new mongoose.Types.ObjectId(merchantId);
    filter.$or = [{ merchantId: { $exists: false } }, { merchantId: oid }];
  }
  const subs = await WebhookSubscription.find(filter).select("url secret").lean().exec();
  return subs.map((s) => ({ url: s.url, secret: s.secret }));
}

export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<{ ok: boolean; status?: number }> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-PayKit-Event": payload.type,
    "X-PayKit-Event-Id": payload.id,
  };
  if (secret) {
    headers["X-PayKit-Signature"] = `sha256=${signPayload(body, secret)}`;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}

export async function processNextWebhookFromQueue(): Promise<boolean> {
  const client = getRedisOptional();
  if (!client) return false;
  const raw = await client.lpop(WEBHOOK_QUEUE_KEY);
  if (!raw) return false;
  let item: WebhookQueueItem;
  try {
    item = JSON.parse(raw) as WebhookQueueItem;
  } catch {
    return true;
  }
  const { merchantWebhookUrl, ...payload } = item;
  if (merchantWebhookUrl) {
    const result = await deliverWebhook(merchantWebhookUrl, payload);
    if (!result.ok && config.webhook.maxRetries > 0) {
      await client.rpush(WEBHOOK_QUEUE_PROCESSING, JSON.stringify({ payload: item, url: merchantWebhookUrl, attempts: 1 })).catch(() => {});
    }
  }
  const merchantFromPayload =
    typeof payload.data.merchant_id === "string"
      ? payload.data.merchant_id
      : typeof payload.data.merchantId === "string"
        ? payload.data.merchantId
        : undefined;
  const subs = await getSubscriptionsForEvent(payload.type as WebhookEventName, merchantFromPayload);
  for (const { url, secret } of subs) {
    const result = await deliverWebhook(url, payload, secret);
    if (!result.ok && config.webhook.maxRetries > 0) {
      await client.rpush(WEBHOOK_QUEUE_PROCESSING, JSON.stringify({ payload: item, url, secret, attempts: 1 })).catch(() => {});
    }
  }
  return true;
}
