import { getRedis } from "./redis";
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
  | "treasury.updated"
  | "path_payment.completed"
  | "checkout.completed"
  | "checkout.failed"
  | "swap.executed"
  | "yield.updated";

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

const STREAM_EVENT_TYPES = new Set<string>([
  "payment.created", "payment.completed", "wallet.created", "swap.executed", "yield.updated",
  "treasury.updated", "checkout.completed",
]);

export async function queueWebhookEvent(
  type: WebhookEventName,
  data: Record<string, unknown>,
  merchantWebhookUrl?: string
): Promise<void> {
  const payload: WebhookQueueItem = {
    id: generateEventId(),
    type,
    created_at: new Date().toISOString(),
    data,
    merchantWebhookUrl,
  };
  const client = getRedis();
  await client.rpush(WEBHOOK_QUEUE_KEY, JSON.stringify(payload));
  if (STREAM_EVENT_TYPES.has(type)) {
    import("./eventStreamService").then(({ publishToEventStream }) => {
      publishToEventStream(type as import("./eventStreamService").StreamEventType, data).catch(() => {});
    });
  }
}

export async function getSubscriptionsForEvent(event: WebhookEventName): Promise<{ url: string; secret?: string }[]> {
  const subs = await WebhookSubscription.find({
    active: true,
    events: event,
  })
    .select("url secret")
    .lean()
    .exec();
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
  } catch (err) {
    return { ok: false };
  }
}

export async function processNextWebhookFromQueue(): Promise<boolean> {
  const client = getRedis();
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
      await client.rpush(WEBHOOK_QUEUE_PROCESSING, JSON.stringify({ payload: item, url: merchantWebhookUrl, attempts: 1 }));
    }
  }
  const subs = await getSubscriptionsForEvent(payload.type as WebhookEventName);
  for (const { url, secret } of subs) {
    const result = await deliverWebhook(url, payload, secret);
    if (!result.ok && config.webhook.maxRetries > 0) {
      await client.rpush(WEBHOOK_QUEUE_PROCESSING, JSON.stringify({ payload: item, url, secret, attempts: 1 }));
    }
  }
  return true;
}
